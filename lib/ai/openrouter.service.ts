const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_COMPLETION_ATTEMPTS = 2;

type JsonSchema = Record<string, unknown>;

type StructuredCompletionInput = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  jsonSchema: JsonSchema;
  timeoutMs?: number;
};

export type StructuredCompletion = {
  data: unknown;
  model: string;
};

export class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

type JsonParseResult =
  | { success: true; data: unknown }
  | { success: false };

function tryParseJson(candidate: string): JsonParseResult {
  try {
    return { success: true, data: JSON.parse(candidate) };
  } catch {
    return { success: false };
  }
}

function findBalancedJsonCandidates(content: string) {
  const candidates: string[] = [];

  for (let start = 0; start < content.length; start += 1) {
    const opening = content[start];

    if (opening !== '{' && opening !== '[') continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const character = content[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }

        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === '{' || character === '[') {
        stack.push(character);
      } else if (character === '}' || character === ']') {
        const expectedOpening = character === '}' ? '{' : '[';

        if (stack.pop() !== expectedOpening) break;

        if (stack.length === 0) {
          candidates.push(content.slice(start, index + 1));
          break;
        }
      }
    }
  }

  return candidates;
}

function parseStructuredContent(content: string): JsonParseResult {
  const candidates = new Set<string>([content.trim()]);
  const fencedJsonPattern = /```(?:json)?\s*([\s\S]*?)\s*```/gi;

  for (const match of content.matchAll(fencedJsonPattern)) {
    if (match[1]) candidates.add(match[1].trim());
  }

  for (const candidate of findBalancedJsonCandidates(content)) {
    candidates.add(candidate);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;

    const parsed = tryParseJson(candidate);
    if (parsed.success) return parsed;
  }

  return { success: false };
}

function getMessageContent(message: Record<string, unknown>) {
  const { content } = message;

  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return null;

  const textParts = content.flatMap((part) => {
    if (typeof part !== 'object' || part === null) return [];

    const text = (part as Record<string, unknown>).text;
    return typeof text === 'string' ? [text] : [];
  });

  return textParts.length > 0 ? textParts.join('\n') : null;
}

export async function generateStructuredCompletion(
  input: StructuredCompletionInput,
): Promise<StructuredCompletion> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured');
  }

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    for (let attempt = 1; attempt <= MAX_COMPLETION_ATTEMPTS; attempt += 1) {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: input.systemPrompt },
            { role: 'user', content: input.userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: input.schemaName,
              strict: true,
              schema: input.jsonSchema,
            },
          },
          plugins: [{ id: 'response-healing' }],
          provider: {
            require_parameters: true,
            sort: 'latency',
          },
          reasoning_effort: 'low',
          include_reasoning: false,
          max_tokens: 4_000,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new OpenRouterError(
          `OpenRouter request failed with status ${response.status}`,
        );
      }

      const payload: unknown = await response.json();

      if (typeof payload !== 'object' || payload === null) {
        throw new OpenRouterError('OpenRouter returned an invalid response');
      }

      const result = payload as Record<string, unknown>;
      const choices = result.choices;
      const responseModel = result.model;
      const resolvedModel =
        typeof responseModel === 'string' ? responseModel : model;

      if (!Array.isArray(choices) || choices.length === 0) {
        throw new OpenRouterError('OpenRouter returned no completion choices');
      }

      const firstChoice = choices[0];

      if (typeof firstChoice !== 'object' || firstChoice === null) {
        throw new OpenRouterError('OpenRouter returned an invalid completion');
      }

      const message = (firstChoice as Record<string, unknown>).message;

      if (typeof message !== 'object' || message === null) {
        throw new OpenRouterError('OpenRouter returned an invalid message');
      }

      const content = getMessageContent(message as Record<string, unknown>);

      if (!content?.trim()) {
        if (attempt < MAX_COMPLETION_ATTEMPTS) continue;

        throw new OpenRouterError(
          `OpenRouter returned empty content (model: ${resolvedModel})`,
        );
      }

      const parsed = parseStructuredContent(content);

      if (parsed.success) {
        return {
          data: parsed.data,
          model: resolvedModel,
        };
      }

      if (attempt === MAX_COMPLETION_ATTEMPTS) {
        throw new OpenRouterError(
          `OpenRouter returned malformed JSON (model: ${resolvedModel})`,
        );
      }
    }

    throw new OpenRouterError('OpenRouter returned no completion');
  } catch (error) {
    if (error instanceof OpenRouterError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenRouterError('OpenRouter request timed out');
    }

    throw new OpenRouterError('OpenRouter request failed');
  } finally {
    clearTimeout(timeout);
  }
}
