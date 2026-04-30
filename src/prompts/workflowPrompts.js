export function bugReportWorkflowPrompt({
  summary,
  stepsToReproduce,
  expected,
  actual,
  environment,
}) {
  return `Return one JSON object only (no markdown) with this shape:
{
  "suggestedTitle": "string under 120 chars",
  "severityGuess": "Blocker|Critical|Major|Minor|Trivial|Unknown",
  "clearReproduction": ["ordered bullet strings"],
  "expectedVsActual": "short comparison paragraph",
  "impact": "user/business impact paragraph",
  "suggestedLabels": ["e.g. regression", "checkout"],
  "missingInfo": ["what the report should still add"],
  "developerHandoff": "one tight paragraph for engineers"
}

Input from tester:

Summary: ${summary || '(none)'}
Steps to reproduce: ${stepsToReproduce || '(none)'}
Expected: ${expected || '(none)'}
Actual: ${actual || '(none)'}
Environment: ${environment || '(none)'}`;
}

export function exploratoryCharterPrompt({ featureArea, mission, timebox, focus }) {
  return `Return one JSON object only (no markdown):
{
  "charterTitle": "string",
  "mission": "1-3 sentences",
  "timeboxSuggestion": "string (respect user timebox if given)",
  "testIdeas": ["strings — angles to explore"],
  "dataToVary": ["inputs, states, configs"],
  "oracles": ["how to know if something is wrong"],
  "sessionNotesTemplate": "short markdown-ish bullet template for the session"
}

Feature / area: ${featureArea || '(unspecified)'}
Mission: ${mission || '(unspecified)'}
Timebox: ${timebox || '(unspecified)'}
Focus risks / questions: ${focus || '(none)'}`;
}

export function releaseChecklistPrompt({ releaseName, scopeNotes, riskNotes }) {
  return `Return one JSON object only (no markdown):
{
  "releaseLabel": "string",
  "preDeploy": [{"item":"string","ownerHint":"QA|Dev|Ops|PM","doneCriteria":"string"}],
  "verification": [{"item":"string","suggestedEvidence":"string"}],
  "rollbackSignals": ["strings"],
  "signoffNotes": "paragraph for stakeholders"
}

Release name/version: ${releaseName || '(unspecified)'}
Scope / changes: ${scopeNotes || '(none)'}
Known risks: ${riskNotes || '(none)'}`;
}

export function riskBrainstormPrompt({ context }) {
  return `Return one JSON object only (no markdown):
{
  "summary": "2-4 sentences",
  "risks": [{"description":"string","likelihood":"Low|Medium|High","impact":"Low|Medium|High","mitigation":"string","testIdeas":["string"]}],
  "assumptions": ["string"],
  "questionsForTeam": ["string"]
}

Context from QA/product:

${context || '(none)'}`;
}
