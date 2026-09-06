const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_COMPLETION_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 1_000;
const TRUNCATION_RETRY_MAX_TOKENS = 1_500;

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

export class GroqError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroqError";
  }
}

type JsonParseResult = { success: true; data: unknown } | { success: false };

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

    if (opening !== "{" && opening !== "[") continue;

    const stack: string[] = [];
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const character = content[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          inString = false;
        }

        continue;
      }

      if (character === '"') {
        inString = true;
      } else if (character === "{" || character === "[") {
        stack.push(character);
      } else if (character === "}" || character === "]") {
        const expectedOpening = character === "}" ? "{" : "[";

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

  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const textParts = content.flatMap((part) => {
    if (typeof part !== "object" || part === null) return [];

    const text = (part as Record<string, unknown>).text;
    return typeof text === "string" ? [text] : [];
  });

  return textParts.length > 0 ? textParts.join("\n") : null;
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

async function getGroqResponseError(response: Response) {
  const status = `status ${response.status}`;

  try {
    const payload: unknown = await response.json();

    if (typeof payload !== "object" || payload === null) {
      return { code: null, details: status };
    }

    const error = (payload as Record<string, unknown>).error;

    if (typeof error !== "object" || error === null) {
      return { code: null, details: status };
    }

    const details = error as Record<string, unknown>;
    const code = typeof details.code === "string" ? details.code : null;
    const type = typeof details.type === "string" ? details.type : null;
    const message =
      typeof details.message === "string"
        ? details.message.replaceAll(/\s+/g, " ").trim().slice(0, 300)
        : null;
    const classification = code ?? type;

    return {
      code,
      details: `${status}${classification ? ` (${classification})` : ""}${
        message ? `: ${message}` : ""
      }`,
    };
  } catch {
    return { code: null, details: status };
  }
}

export async function generateStructuredCompletion(
  input: StructuredCompletionInput,
): Promise<StructuredCompletion> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new GroqError("GROQ_API_KEY is not configured");
  }

  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    let previousFailure: string | null = null;

    for (let attempt = 1; attempt <= MAX_COMPLETION_ATTEMPTS; attempt += 1) {
      const maxTokens = previousFailure?.includes("token limit")
        ? TRUNCATION_RETRY_MAX_TOKENS
        : DEFAULT_MAX_TOKENS;
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: getAttemptSystemPrompt(
                input.systemPrompt,
                previousFailure,
              ),
            },
            { role: "user", content: input.userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: input.schemaName,
              strict: true,
              schema: input.jsonSchema,
            },
          },
          reasoning_effort: "low",
          include_reasoning: false,
          max_completion_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseError = await getGroqResponseError(response);

        if (
          responseError.code === "json_validate_failed" &&
          attempt < MAX_COMPLETION_ATTEMPTS
        ) {
          previousFailure = "JSON that did not match the required schema";
          continue;
        }

        throw new GroqError(
          `Groq request failed with ${responseError.details}`,
        );
      }

      const payload: unknown = await response.json();

      if (typeof payload !== "object" || payload === null) {
        throw new GroqError("Groq returned an invalid response");
      }

      const result = payload as Record<string, unknown>;
      const choices = result.choices;
      const responseModel = result.model;
      const resolvedModel =
        typeof responseModel === "string" ? responseModel : model;

      if (!Array.isArray(choices) || choices.length === 0) {
        throw new GroqError("Groq returned no completion choices");
      }

      const firstChoice = choices[0];

      if (typeof firstChoice !== "object" || firstChoice === null) {
        throw new GroqError("Groq returned an invalid completion");
      }

      const choice = firstChoice as Record<string, unknown>;
      const message = choice.message;
      const finishReason =
        typeof choice.finish_reason === "string" ? choice.finish_reason : null;

      if (typeof message !== "object" || message === null) {
        throw new GroqError("Groq returned an invalid message");
      }

      const content = getMessageContent(message as Record<string, unknown>);

      if (!content?.trim()) {
        previousFailure =
          finishReason === "length"
            ? "an empty or truncated response caused by the token limit"
            : "an empty response";

        if (attempt < MAX_COMPLETION_ATTEMPTS) continue;

        throw new GroqError(
          `Groq returned empty content (${getCompletionDetails(resolvedModel, finishReason)})`,
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
        finishReason === "length"
          ? "truncated JSON caused by the token limit"
          : "malformed JSON";

      if (attempt === MAX_COMPLETION_ATTEMPTS) {
        const failureType =
          finishReason === "length" ? "truncated JSON" : "malformed JSON";

        throw new GroqError(
          `Groq returned ${failureType} (${getCompletionDetails(resolvedModel, finishReason)})`,
        );
      }
    }

    throw new GroqError("Groq returned no completion");
  } catch (error) {
    if (error instanceof GroqError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GroqError("Groq request timed out");
    }

    throw new GroqError("Groq request failed");
  } finally {
    clearTimeout(timeout);
  }
}
