import { generateWithOpenAI } from '../providers/openaiProvider.js';
import { generateWithGroq } from '../providers/groqProvider.js';
import { generateWithGemini } from '../providers/geminiProvider.js';

export async function runGeneration(provider, payload) {
  if (provider === 'openai') {
    return generateWithOpenAI(payload);
  }
  if (provider === 'groq') {
    return generateWithGroq(payload);
  }
  if (provider === 'gemini') {
    return generateWithGemini(payload);
  }
  throw new Error(`Unknown provider: ${provider}`);
}
