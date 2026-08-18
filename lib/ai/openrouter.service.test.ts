import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateStructuredCompletion,
  OpenRouterError,
} from './openrouter.service';

const completionInput = {
  systemPrompt: 'System prompt',
  userPrompt: 'User prompt',
  schemaName: 'test_schema',
  jsonSchema: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
    additionalProperties: false,
  },
};

async function withMockedOpenRouter(
  mockFetch: typeof fetch,
  callback: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENROUTER_API_KEY;
  const originalModel = process.env.OPENROUTER_MODEL;

  globalThis.fetch = mockFetch;
  process.env.OPENROUTER_API_KEY = 'test-key';
  process.env.OPENROUTER_MODEL = 'openai/gpt-oss-20b:free';

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalApiKey;

    if (originalModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = originalModel;
  }
}

test('sends a structured output request and returns the actual model', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const mockFetch: typeof fetch = async (input, init) => {
    requestUrl = input.toString();
    requestInit = init;

    return new Response(
      JSON.stringify({
        model: 'meta-llama/llama-free',
        choices: [{ message: { content: JSON.stringify({ value: 'ok' }) } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  await withMockedOpenRouter(mockFetch, async () => {
    const completion = await generateStructuredCompletion(completionInput);
    const headers = new Headers(requestInit?.headers);
    const body = JSON.parse(String(requestInit?.body));

    assert.equal(requestUrl, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(headers.get('Authorization'), 'Bearer test-key');
    assert.equal(headers.get('Content-Type'), 'application/json');
    assert.equal(body.model, 'openai/gpt-oss-20b:free');
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.provider.sort, 'latency');
    assert.equal(body.reasoning_effort, 'low');
    assert.equal(body.include_reasoning, false);
    assert.equal(body.max_tokens, 4_000);
    assert.deepEqual(completion.data, { value: 'ok' });
    assert.equal(completion.model, 'meta-llama/llama-free');
  });
});

test('rejects provider errors and malformed completion JSON', async () => {
  await withMockedOpenRouter(
    async () => new Response('Unauthorized', { status: 401 }),
    async () => {
      await assert.rejects(
        generateStructuredCompletion(completionInput),
        /status 401/,
      );
    },
  );

  await withMockedOpenRouter(
    async () =>
      new Response(
        JSON.stringify({
          model: 'test/model',
          choices: [{ message: { content: 'not-json' } }],
        }),
        { status: 200 },
      ),
    async () => {
      await assert.rejects(
        generateStructuredCompletion(completionInput),
        /malformed JSON \(model: test\/model\)/,
      );
    },
  );
});

test('aborts an OpenRouter request after the configured timeout', async () => {
  const mockFetch: typeof fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });

  await withMockedOpenRouter(mockFetch, async () => {
    await assert.rejects(
      generateStructuredCompletion({ ...completionInput, timeoutMs: 5 }),
      (error) =>
        error instanceof OpenRouterError &&
        error.message === 'OpenRouter request timed out',
    );
  });
});
