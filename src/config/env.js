import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..', '..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'src', '.env') });
dotenv.config();

export const PORT = Number(process.env.PORT) || 3847;

/** Official OpenAI API (Chat Completions + vision). */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/** Google Gemini API. */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/** Groq (OpenAI-compatible API at api.groq.com). */
export const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Default when multiple keys exist: openai | gemini | groq | auto.
 * auto picks first available: OpenAI, then Groq, then Gemini (override with request body provider).
 */
export const AI_PROVIDER_DEFAULT = (process.env.AI_PROVIDER || 'auto').toLowerCase();

export function getProviderAvailability() {
  return {
    openai: Boolean(OPENAI_API_KEY),
    groq: Boolean(GROQ_API_KEY),
    gemini: Boolean(GEMINI_API_KEY),
  };
}

function pickFirstAuto(hasOpenai, hasGroq, hasGemini) {
  if (hasOpenai) {
    return 'openai';
  }
  if (hasGroq) {
    return 'groq';
  }
  if (hasGemini) {
    return 'gemini';
  }
  return null;
}

export function resolveActiveProvider(requested) {
  const hasOpenai = Boolean(OPENAI_API_KEY);
  const hasGroq = Boolean(GROQ_API_KEY);
  const hasGemini = Boolean(GEMINI_API_KEY);
  const req = requested ? String(requested).toLowerCase() : '';

  if (req === 'openai') {
    if (!hasOpenai) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    return 'openai';
  }
  if (req === 'groq') {
    if (!hasGroq) {
      throw new Error('GROQ_API_KEY is not set');
    }
    return 'groq';
  }
  if (req === 'gemini') {
    if (!hasGemini) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    return 'gemini';
  }

  if (AI_PROVIDER_DEFAULT === 'openai' && hasOpenai) {
    return 'openai';
  }
  if (AI_PROVIDER_DEFAULT === 'groq' && hasGroq) {
    return 'groq';
  }
  if (AI_PROVIDER_DEFAULT === 'gemini' && hasGemini) {
    return 'gemini';
  }

  if (AI_PROVIDER_DEFAULT === 'auto') {
    const picked = pickFirstAuto(hasOpenai, hasGroq, hasGemini);
    if (picked) {
      return picked;
    }
  }

  const fallback = pickFirstAuto(hasOpenai, hasGroq, hasGemini);
  if (fallback) {
    return fallback;
  }

  throw new Error(
    'No AI provider configured. Set OPENAI_API_KEY, GROQ_API_KEY, and/or GEMINI_API_KEY in .env',
  );
}
