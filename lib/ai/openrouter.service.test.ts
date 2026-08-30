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
  process.env.OPENROUTER_MODEL = 'openrouter/free';

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
    assert.equal(body.model, 'openrouter/free');
    assert.equal(body.response_format.type, 'json_schema');
    assert.equal(body.response_format.json_schema.strict, true);
    assert.deepEqual(body.plugins, [{ id: 'response-healing' }]);
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.provider.sort, 'latency');
    assert.equal(body.reasoning_effort, 'low');
    assert.equal(body.include_reasoning, false);
    assert.equal(body.max_tokens, 4_000);
    assert.deepEqual(completion.data, { value: 'ok' });
    assert.equal(completion.model, 'meta-llama/llama-free');
  });
});

test('parses JSON wrapped in markdown or explanatory text', async () => {
  const contents = [
    '```json\n{"value":"from markdown"}\n```',
    'Here is the requested result:\n{"value":"from prose"}\nDone.',
  ];
  let callCount = 0;
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        model: 'test/free-model',
        choices: [{ message: { content: contents[callCount++] } }],
      }),
      { status: 200 },
    );

  await withMockedOpenRouter(mockFetch, async () => {
    const markdown = await generateStructuredCompletion(completionInput);
    const prose = await generateStructuredCompletion(completionInput);

    assert.deepEqual(markdown.data, { value: 'from markdown' });
    assert.deepEqual(prose.data, { value: 'from prose' });
  });
});

test('parses text content blocks returned by a provider', async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        model: 'test/free-model',
        choices: [
          {
            message: {
              content: [
                { type: 'text', text: 'Result:\n' },
                { type: 'text', text: '{"value":"from blocks"}' },
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );

  await withMockedOpenRouter(mockFetch, async () => {
    const completion = await generateStructuredCompletion(completionInput);

    assert.deepEqual(completion.data, { value: 'from blocks' });
  });
});

test('retries truncated model output with reinforced instructions and more tokens', async () => {
  let callCount = 0;
  const requestBodies: Record<string, unknown>[] = [];
  const mockFetch: typeof fetch = async (_input, init) => {
    callCount += 1;
    requestBodies.push(JSON.parse(String(init?.body)));

    return new Response(
      JSON.stringify({
        model: `test/free-model-${callCount}`,
        choices: [
          {
            finish_reason: callCount === 1 ? 'length' : 'stop',
            message: {
              content:
                callCount === 1 ? '{"value":' : '{"value":"recovered"}',
            },
          },
        ],
      }),
      { status: 200 },
    );
  };

  await withMockedOpenRouter(mockFetch, async () => {
    const completion = await generateStructuredCompletion(completionInput);

    assert.equal(callCount, 2);
    assert.equal(requestBodies[0].max_tokens, 4_000);
    assert.equal(requestBodies[1].max_tokens, 8_000);
    assert.match(
      String(
        (requestBodies[1].messages as { content: string }[])[0].content,
      ),
      /IMPORTANT RETRY[\s\S]*token limit/,
    );
    assert.deepEqual(completion.data, { value: 'recovered' });
    assert.equal(completion.model, 'test/free-model-2');
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
        /malformed JSON \(model: test\/model, finish reason: unavailable\)/,
      );
    },
  );
});

test('reports the model finish reason after the final invalid response', async () => {
  const mockFetch: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        model: 'test/truncated-model',
        choices: [
          {
            finish_reason: 'length',
            message: { content: '{"value":' },
          },
        ],
      }),
      { status: 200 },
    );

  await withMockedOpenRouter(mockFetch, async () => {
    await assert.rejects(
      generateStructuredCompletion(completionInput),
      /truncated JSON \(model: test\/truncated-model, finish reason: length\)/,
    );
  });
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
