export function normalizeGenerationPayload(raw) {
  const suite = raw.suite && typeof raw.suite === 'object' ? raw.suite : {};
  const testCases = Array.isArray(raw.testCases) ? raw.testCases : [];
  return { suite, testCases };
}
