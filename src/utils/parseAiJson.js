export function parseAiJsonResponse(text) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const payload = jsonMatch ? jsonMatch[0] : trimmed;
  return JSON.parse(payload);
}
