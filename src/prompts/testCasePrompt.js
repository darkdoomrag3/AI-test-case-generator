/**
 * Structured prompts for QA-grade output (traceability, risk, automation hints).
 */

export function buildSystemPrompt() {
  return `You are a Senior QA Lead and Test Architect. Produce exhaustive, review-ready test artefacts from requirements (and optional screenshots).

Return ONE strictly valid JSON object (no markdown fences) matching this shape:
{
  "suite": {
    "featureName": "string",
    "platform": "string",
    "summary": "2-5 sentences on coverage focus",
    "scope": "Smoke|Comprehensive",
    "assumptions": ["string"],
    "openQuestions": ["gaps or clarifications for PO/Dev"],
    "risks": ["product or release risks tied to testing"]
  },
  "testCases": [
    {
      "id": "TC-001",
      "title": "Imperative, specific title",
      "requirementRefs": ["REQ-1", "BRD-3"],
      "priority": "Critical|High|Medium|Low",
      "severity": "Blocker|Critical|Major|Minor|Trivial",
      "type": "Functional|API|UI|Integration|E2E|Regression|Security|Performance|Accessibility|Edge-Case",
      "category": "Positive|Negative|Boundary|Error-Handling|Exploratory",
      "risk": "High|Medium|Low",
      "automation": { "candidate": true, "notes": "e.g. stable selectors, API contracts" },
      "preconditions": "Accounts, flags, backend state",
      "testData": "Representative inputs; boundary values where relevant",
      "steps": [
        { "step": 1, "action": "Exact user/action step", "expected": "Observable expected outcome" }
      ],
      "expectedResult": "Overall pass criteria for the case",
      "postconditions": "Cleanup or persisted state",
      "tags": ["smoke", "regression"]
    }
  ]
}

Rules:
- IDs must be sequential: TC-001, TC-002, ...
- Include Happy path, negatives, boundaries, auth/session/error paths as applicable.
- For APIs: cover status codes, validation, idempotency where relevant.
- For UI: accessibility basics (labels, focus, errors) where relevant.
- requirementRefs may be empty arrays if none given; otherwise map to provided REQ IDs.
- Prefer clarity over quantity: for Comprehensive scope aim for roughly 12-24 cases; for Smoke, roughly 6-10 focused cases.`;
}

export function buildUserPrompt({
  featureName,
  platform,
  requirements,
  depth,
  includeNonFunctional,
  requirementContext,
}) {
  const nf = includeNonFunctional
    ? 'Include applicable non-functional angles: performance expectations, basic security (e.g. authz, PII), accessibility notes.'
    : 'Focus on functional correctness; mention non-functional items only if critical.';
  const ctx = requirementContext?.trim()
    ? `\nTraceability / requirement IDs (map to requirementRefs):\n${requirementContext}\n`
    : '';
  return `Feature name: ${featureName || 'Unknown feature'}
Platform: ${platform || 'Web'}
Test depth: ${depth || 'Comprehensive'}

${ctx}Product requirements:
${requirements}

${nf}

Output JSON only.`;
}
