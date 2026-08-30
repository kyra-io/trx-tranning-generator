const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_COMPLETION_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 4_000;
const TRUNCATION_RETRY_MAX_TOKENS = 8_000;

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

function getAttemptSystemPrompt(
  systemPrompt: string,
  previousFailure: string | null,
) {
  if (!previousFailure) return systemPrompt;

  return `${systemPrompt}

IMPORTANT RETRY: The previous generation returned ${previousFailure}. Produce the complete answer again from the original instructions. Return exactly one valid JSON object, with no Markdown, explanations, prefixes, or suffixes. Keep all free-text fields concise and ensure the response ends with the closing brace.`;
}

function getCompletionDetails(model: string, finishReason: string | null) {
  return finishReason
    ? `model: ${model}, finish reason: ${finishReason}`
    : `model: ${model}, finish reason: unavailable`;
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
    let previousFailure: string | null = null;

    for (let attempt = 1; attempt <= MAX_COMPLETION_ATTEMPTS; attempt += 1) {
      const maxTokens = previousFailure?.includes('token limit')
        ? TRUNCATION_RETRY_MAX_TOKENS
        : DEFAULT_MAX_TOKENS;
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: getAttemptSystemPrompt(
                input.systemPrompt,
                previousFailure,
              ),
            },
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
          max_tokens: maxTokens,
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

      const choice = firstChoice as Record<string, unknown>;
      const message = choice.message;
      const finishReason =
        typeof choice.finish_reason === 'string' ? choice.finish_reason : null;

      if (typeof message !== 'object' || message === null) {
        throw new OpenRouterError('OpenRouter returned an invalid message');
      }

      const content = getMessageContent(message as Record<string, unknown>);

      if (!content?.trim()) {
        previousFailure =
          finishReason === 'length'
            ? 'an empty or truncated response caused by the token limit'
            : 'an empty response';

        if (attempt < MAX_COMPLETION_ATTEMPTS) continue;

        throw new OpenRouterError(
          `OpenRouter returned empty content (${getCompletionDetails(resolvedModel, finishReason)})`,
        );
      }

      const parsed = parseStructuredContent(content);

      if (parsed.success) {
        return {
          data: parsed.data,
          model: resolvedModel,
        };
      }

      previousFailure =
        finishReason === 'length'
          ? 'truncated JSON caused by the token limit'
          : 'malformed JSON';

      if (attempt === MAX_COMPLETION_ATTEMPTS) {
        const failureType =
          finishReason === 'length' ? 'truncated JSON' : 'malformed JSON';

        throw new OpenRouterError(
          `OpenRouter returned ${failureType} (${getCompletionDetails(resolvedModel, finishReason)})`,
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
