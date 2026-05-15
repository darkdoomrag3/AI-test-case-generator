import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCsvRows, buildMarkdownDocument, buildXmlDocument } from '../src/routes/exportHelpers.js';
import { normalizeGenerationPayload } from '../src/utils/normalizePayload.js';
import { parseAiJsonResponse } from '../src/utils/parseAiJson.js';

test('parseAiJsonResponse handles fenced JSON and braces inside strings', () => {
  const parsed = parseAiJsonResponse('```json\n{"message":"keep {this}","ok":true}\n```');
  assert.deepEqual(parsed, { message: 'keep {this}', ok: true });
});

test('parseAiJsonResponse extracts the first balanced object from prose', () => {
  const parsed = parseAiJsonResponse('Result:\n{"a":{"b":"} still text"},"c":1}\nThanks');
  assert.deepEqual(parsed, { a: { b: '} still text' }, c: 1 });
});

test('normalizeGenerationPayload fills required arrays and fallback ids', () => {
  const normalized = normalizeGenerationPayload({
    suite: { featureName: 'Checkout' },
    testCases: [{ title: '', steps: [{ action: 'Pay' }] }],
  });

  assert.equal(normalized.testCases[0].id, 'TC-001');
  assert.equal(normalized.testCases[0].title, 'Untitled test case');
  assert.deepEqual(normalized.testCases[0].requirementRefs, []);
  assert.deepEqual(normalized.testCases[0].tags, []);
  assert.deepEqual(normalized.testCases[0].steps[0], {
    step: 1,
    action: 'Pay',
    expected: '',
  });
});

test('exports escape content safely', () => {
  const testCases = [
    {
      id: 'TC-001',
      title: 'Use "quotes" and <xml>',
      priority: 'High',
      automation: { candidate: true, notes: 'contains ]]> marker' },
      steps: [{ step: 1, action: 'Click | submit', expected: 'Done ]]> now' }],
      tags: ['regression'],
    },
  ];

  const csv = buildCsvRows(testCases);
  assert.match(csv, /"Use ""quotes"" and <xml>"/);

  const xml = buildXmlDocument(testCases);
  assert.match(xml, /<id>TC-001<\/id>/);
  assert.match(xml, /]]]]><!\[CDATA\[>/);

  const md = buildMarkdownDocument({}, testCases);
  assert.match(md, /Click \\| submit/);
});
