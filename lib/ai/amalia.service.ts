const AMALIA_URL = 'https://api.iaamalia.com/api/v1/chat/completions';
const DEFAULT_MODEL = 'caravela';
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

export class AmaliaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AmaliaError';
  }
}

export async function generateStructuredCompletion(
  input: StructuredCompletionInput,
): Promise<StructuredCompletion> {
  const apiKey = process.env.AMALIA_API_KEY;

  if (!apiKey) {
    throw new AmaliaError('AMALIA_API_KEY is not configured');
  }

  const model = process.env.AMALIA_MODEL ?? DEFAULT_MODEL;
  const schemaInstruction = `Return only valid JSON matching this schema. Do not include markdown fences or explanatory text. Schema: ${JSON.stringify(input.jsonSchema)}`;
  const systemMessage = `${input.systemPrompt} ${schemaInstruction}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await fetch(AMALIA_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: input.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AmaliaError(
        `Amalia request failed with status ${response.status}`,
      );
    }

    const payload: unknown = await response.json();

    if (typeof payload !== 'object' || payload === null) {
      throw new AmaliaError('Amalia returned an invalid response');
    }

    const result = payload as Record<string, unknown>;
    const choices = result.choices;
    const responseModel = result.model;
    const resolvedModel =
      typeof responseModel === 'string' ? responseModel : model;

    if (!Array.isArray(choices) || choices.length === 0) {
      throw new AmaliaError('Amalia returned no completion choices');
    }

    const firstChoice = choices[0];

    if (typeof firstChoice !== 'object' || firstChoice === null) {
      throw new AmaliaError('Amalia returned an invalid completion');
    }

    const message = (firstChoice as Record<string, unknown>).message;

    if (typeof message !== 'object' || message === null) {
      throw new AmaliaError('Amalia returned an invalid message');
    }

    const content = (message as Record<string, unknown>).content;

    if (typeof content !== 'string' || content.trim() === '') {
      throw new AmaliaError(
        `Amalia returned empty content (model: ${resolvedModel})`,
      );
    }

    let data: unknown;

    try {
      data = JSON.parse(content);
    } catch {
      throw new AmaliaError(
        `Amalia returned malformed JSON (model: ${resolvedModel})`,
      );
    }

    return {
      data,
      model: resolvedModel,
    };
  } catch (error) {
    if (error instanceof AmaliaError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new AmaliaError('Amalia request timed out');
    }

    throw new AmaliaError('Amalia request failed');
  } finally {
    clearTimeout(timeout);
  }
}
