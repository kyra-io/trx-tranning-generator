const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b:free';
const DEFAULT_TIMEOUT_MS = 60_000;

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
        provider: {
          require_parameters: true,
          sort: 'latency',
        },
        reasoning_effort: 'low',
        include_reasoning: false,
        max_tokens: 2_000,
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

    const content = (message as Record<string, unknown>).content;

    if (typeof content !== 'string' || content.trim() === '') {
      throw new OpenRouterError(
        `OpenRouter returned empty content (model: ${resolvedModel})`,
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch {
      console.error('OpenRouter malformed content for debugging:', content);
      throw new OpenRouterError(
        `OpenRouter returned malformed JSON (model: ${resolvedModel})`,
      );
    }

    return {
      data,
      model: resolvedModel,
    };
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
