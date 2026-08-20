import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AmaliaError,
  generateStructuredCompletion,
} from './amalia.service';

const completionInput = {
  systemPrompt: 'Generate a workout.',
  userPrompt: '{"goal":"strength"}',
  schemaName: 'trx_workout_plan',
  jsonSchema: {
    type: 'object',
    properties: { value: { type: 'string' } },
    required: ['value'],
    additionalProperties: false,
  },
};

async function withAmaliaEnvironment(
  mockFetch: typeof fetch,
  callback: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.AMALIA_API_KEY;
  const originalModel = process.env.AMALIA_MODEL;

  globalThis.fetch = mockFetch;
  process.env.AMALIA_API_KEY = 'test-key';
  process.env.AMALIA_MODEL = 'caravela';

  try {
    await callback();
  } finally {
    globalThis.fetch = originalFetch;

    if (originalApiKey === undefined) delete process.env.AMALIA_API_KEY;
    else process.env.AMALIA_API_KEY = originalApiKey;

    if (originalModel === undefined) delete process.env.AMALIA_MODEL;
    else process.env.AMALIA_MODEL = originalModel;
  }
}

test('sends Amalia an OpenAI-compatible request with schema instructions', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const mockFetch: typeof fetch = async (input, init) => {
    requestUrl = input.toString();
    requestInit = init;

    return new Response(
      JSON.stringify({
        model: 'caravela',
        choices: [{ message: { content: '{"value":"ok"}' } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  await withAmaliaEnvironment(mockFetch, async () => {
    const completion = await generateStructuredCompletion(completionInput);
    const body = JSON.parse(String(requestInit?.body));

    assert.equal(
      requestUrl,
      'https://api.iaamalia.com/api/v1/chat/completions',
    );
    assert.equal(body.model, 'caravela');
    assert.equal(body.response_format, undefined);
    assert.equal(body.provider, undefined);
    assert.match(body.messages[0].content, /Generate a workout\./);
    assert.match(body.messages[0].content, /Return only valid JSON/);
    assert.deepEqual(completion.data, { value: 'ok' });
    assert.equal(completion.model, 'caravela');
  });
});

test('reports malformed JSON returned by Amalia', async () => {
  await withAmaliaEnvironment(
    async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'not-json' } }],
        }),
        { status: 200 },
      ),
    async () => {
      await assert.rejects(
        generateStructuredCompletion(completionInput),
        (error) =>
          error instanceof AmaliaError &&
          error.message === 'Amalia returned malformed JSON (model: caravela)',
      );
    },
  );
});
