import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';

import { createApiRouter } from '../src/routes/api.js';

function createTestApp() {
  const app = express();
  const upload = {
    array: () => (_req, _res, next) => next(),
  };
  app.use('/api', createApiRouter(upload));
  return app;
}

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const { port } = server.address();
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

test('GET /api/health returns service metadata', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      status: 'ok',
      service: 'ai-test-case-generator',
    });
  });
});

test('POST /api/export/json rejects missing testCases arrays', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/export/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suite: {} }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, 'testCases array is required');
  });
});

test('POST /api/export/md returns markdown for valid suites', async () => {
  await withServer(createTestApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/export/md`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suite: { featureName: 'Checkout', platform: 'Web', scope: 'Smoke' },
        testCases: [
          {
            id: 'TC-001',
            title: 'Submit order',
            priority: 'High',
            steps: [{ step: 1, action: 'Click pay', expected: 'Order is created' }],
          },
        ],
      }),
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/markdown/);
    assert.match(body, /# Test suite: Checkout/);
    assert.match(body, /TC-001 - Submit order/);
  });
});
