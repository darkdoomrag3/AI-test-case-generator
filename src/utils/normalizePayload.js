export function normalizeGenerationPayload(raw) {
  const suite = raw.suite && typeof raw.suite === 'object' ? raw.suite : {};
  const testCases = Array.isArray(raw.testCases)
    ? raw.testCases.map(normalizeTestCase)
    : [];
  return { suite, testCases };
}

function normalizeTestCase(testCase, index) {
  const tc = testCase && typeof testCase === 'object' ? testCase : {};
  const steps = Array.isArray(tc.steps)
    ? tc.steps.map((step, stepIndex) => normalizeStep(step, stepIndex))
    : [];

  return {
    ...tc,
    id: tc.id || `TC-${String(index + 1).padStart(3, '0')}`,
    title: tc.title || 'Untitled test case',
    requirementRefs: Array.isArray(tc.requirementRefs) ? tc.requirementRefs : [],
    automation:
      tc.automation && typeof tc.automation === 'object'
        ? tc.automation
        : { candidate: null, notes: '' },
    steps,
    tags: Array.isArray(tc.tags) ? tc.tags : [],
  };
}

function normalizeStep(step, index) {
  const s = step && typeof step === 'object' ? step : {};
  return {
    step: Number.isFinite(Number(s.step)) ? Number(s.step) : index + 1,
    action: s.action || '',
    expected: s.expected || '',
  };
}
