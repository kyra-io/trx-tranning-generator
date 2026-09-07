const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "ministral-14b-latest";
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_COMPLETION_ATTEMPTS = 2;
const DEFAULT_MAX_TOKENS = 1_000;
const TRUNCATION_RETRY_MAX_TOKENS = 1_500;
const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;

let rateLimitCooldownUntil = 0;

type JsonSchema = Record<string, unknown>;

type StructuredCompletionInput = {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  jsonSchema: JsonSchema;
  timeoutMs?: number;
  maxAttempts?: number;
  maxTokens?: number;
};

export type StructuredCompletion = {
  data: unknown;
  model: string;
};

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'unknown',
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export function resetAiRateLimitCooldown() {
  rateLimitCooldownUntil = 0;
}

function parseDurationMilliseconds(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const numericSeconds = Number(trimmed);
  if (Number.isFinite(numericSeconds)) return numericSeconds * 1_000;

  let milliseconds = 0;
  let matched = false;
  for (const match of trimmed.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2];
    milliseconds += amount * (
      unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : unit === 's' ? 1_000 : 1
    );
  }
  return matched ? milliseconds : null;
}

function getRateLimitCooldownMs(response: Response) {
  const retryAfter = response.headers.get('retry-after');
  let cooldown = parseDurationMilliseconds(retryAfter);

  if (cooldown === null && retryAfter) {
    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) cooldown = retryDate - Date.now();
  }

  cooldown ??= DEFAULT_RATE_LIMIT_COOLDOWN_MS;

  return Math.min(
    MAX_RATE_LIMIT_COOLDOWN_MS,
    Math.max(1_000, Math.ceil(cooldown)),
  );
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
  const start = content.search(/[\[{]/);

  if (start === -1) return [];

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

      if (stack.pop() !== expectedOpening) return [];

      if (stack.length === 0) {
        return [content.slice(start, index + 1)];
      }
    }
  }

  return [];
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

function isTokenLimitFinishReason(finishReason: string | null) {
  return finishReason === "length" || finishReason === "model_length";
}

async function getProviderResponseError(response: Response) {
  const status = `status ${response.status}`;

  try {
    const payload: unknown = await response.json();

    if (typeof payload !== "object" || payload === null) {
      return { code: null, details: status };
    }

    const payloadRecord = payload as Record<string, unknown>;
    const nestedError = payloadRecord.error;
    const details = typeof nestedError === "object" && nestedError !== null
      ? nestedError as Record<string, unknown>
      : payloadRecord;
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
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new AiProviderError("MISTRAL_API_KEY is not configured");
  }

  const model = process.env.MISTRAL_MODEL ?? DEFAULT_MODEL;
  const cooldownRemaining = rateLimitCooldownUntil - Date.now();
  if (cooldownRemaining > 0) {
    throw new AiProviderError(
      `Mistral rate limit cooldown active (${Math.ceil(cooldownRemaining / 1_000)}s remaining)`,
      'rate_limit_exceeded',
    );
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    let previousFailure: string | null = null;

    const maximumAttempts = Math.max(
      1,
      Math.min(MAX_COMPLETION_ATTEMPTS, input.maxAttempts ?? MAX_COMPLETION_ATTEMPTS),
    );

    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      const requestedMaxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
      const maxTokens = previousFailure?.includes("token limit")
        ? Math.max(requestedMaxTokens, TRUNCATION_RETRY_MAX_TOKENS)
        : requestedMaxTokens;
      const response = await fetch(MISTRAL_URL, {
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
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseError = await getProviderResponseError(response);

        if (response.status === 429) {
          rateLimitCooldownUntil = Date.now() + getRateLimitCooldownMs(response);
          throw new AiProviderError(
            `Mistral request failed with ${responseError.details}`,
            'rate_limit_exceeded',
          );
        }

        if (
          responseError.code === "json_validate_failed" &&
          attempt < maximumAttempts
        ) {
          previousFailure = "JSON that did not match the required schema";
          continue;
        }

        throw new AiProviderError(
          `Mistral request failed with ${responseError.details}`,
          responseError.code ?? `http_${response.status}`,
        );
      }

      const payload: unknown = await response.json();

      if (typeof payload !== "object" || payload === null) {
        throw new AiProviderError("Mistral returned an invalid response");
      }

      const result = payload as Record<string, unknown>;
      const choices = result.choices;
      const responseModel = result.model;
      const resolvedModel =
        typeof responseModel === "string" ? responseModel : model;

      if (!Array.isArray(choices) || choices.length === 0) {
        throw new AiProviderError("Mistral returned no completion choices");
      }

      const firstChoice = choices[0];

      if (typeof firstChoice !== "object" || firstChoice === null) {
        throw new AiProviderError("Mistral returned an invalid completion");
      }

      const choice = firstChoice as Record<string, unknown>;
      const message = choice.message;
      const finishReason =
        typeof choice.finish_reason === "string" ? choice.finish_reason : null;

      if (typeof message !== "object" || message === null) {
        throw new AiProviderError("Mistral returned an invalid message");
      }

      const content = getMessageContent(message as Record<string, unknown>);

      if (!content?.trim()) {
        previousFailure =
          isTokenLimitFinishReason(finishReason)
            ? "an empty or truncated response caused by the token limit"
            : "an empty response";

        if (attempt < maximumAttempts) continue;

        throw new AiProviderError(
          `Mistral returned empty content (${getCompletionDetails(resolvedModel, finishReason)})`,
          'invalid_output',
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
        isTokenLimitFinishReason(finishReason)
          ? "truncated JSON caused by the token limit"
          : "malformed JSON";

      if (attempt === maximumAttempts) {
        const failureType =
          isTokenLimitFinishReason(finishReason)
            ? "truncated JSON"
            : "malformed JSON";

        throw new AiProviderError(
          `Mistral returned ${failureType} (${getCompletionDetails(resolvedModel, finishReason)})`,
          'invalid_output',
        );
      }
    }

    throw new AiProviderError("Mistral returned no completion", 'invalid_output');
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError("Mistral request timed out", 'timeout');
    }

    throw new AiProviderError("Mistral request failed");
  } finally {
    clearTimeout(timeout);
  }
}
