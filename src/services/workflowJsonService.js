import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  OPENAI_API_KEY,
  GROQ_API_KEY,
  GEMINI_API_KEY,
} from '../config/env.js';
import { parseAiJsonResponse } from '../utils/parseAiJson.js';

const OPENAI_MODEL =
  process.env.WORKFLOW_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODEL =
  process.env.WORKFLOW_GROQ_MODEL ||
  process.env.GROQ_TEXT_MODEL ||
  'llama-3.3-70b-versatile';
const GEMINI_MODEL =
  process.env.WORKFLOW_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function openaiJson(provider, system, user) {
  const isGroq = provider === 'groq';
  const client = new OpenAI(
    isGroq
      ? { apiKey: GROQ_API_KEY, baseURL: GROQ_BASE }
      : { apiKey: OPENAI_API_KEY },
  );
  const model = isGroq ? GROQ_MODEL : OPENAI_MODEL;
  const base = {
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 8192,
    temperature: 0.35,
  };
  try {
    const completion = await client.chat.completions.create({
      ...base,
      response_format: { type: 'json_object' },
    });
    return parseAiJsonResponse(completion.choices[0].message.content);
  } catch (firstErr) {
    const msg = String(firstErr?.message || '').toLowerCase();
    const retry =
      firstErr?.status === 400 ||
      msg.includes('response_format') ||
      msg.includes('json_object');
    if (!retry) {
      throw firstErr;
    }
    const completion = await client.chat.completions.create(base);
    return parseAiJsonResponse(completion.choices[0].message.content);
  }
}

async function geminiJson(system, user) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${system}\n\n${user}` }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  });
  return parseAiJsonResponse(result.response.text());
}

export async function runWorkflowJson(provider, system, user) {
  if (provider === 'gemini') {
    return geminiJson(system, user);
  }
  if (provider === 'openai' || provider === 'groq') {
    return openaiJson(provider, system, user);
  }
  throw new Error(`Workflow JSON not implemented for ${provider}`);
}
