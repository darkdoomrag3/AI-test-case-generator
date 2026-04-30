import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  OPENAI_API_KEY,
  GROQ_API_KEY,
  GEMINI_API_KEY,
} from '../config/env.js';
import { QA_COPILOT_SYSTEM } from '../prompts/agentPrompt.js';

const OPENAI_AGENT_MODEL =
  process.env.AGENT_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_AGENT_BASE = 'https://api.groq.com/openai/v1';
const GROQ_AGENT_MODEL =
  process.env.GROQ_AGENT_MODEL ||
  process.env.GROQ_TEXT_MODEL ||
  'llama-3.3-70b-versatile';
const GEMINI_AGENT_MODEL =
  process.env.AGENT_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function sanitizeTurns(messages) {
  return messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').slice(0, 48000),
    }))
    .slice(-24);
}

function openaiCompatibleChat({ apiKey, baseURL, model, messages }) {
  const client = new OpenAI(
    baseURL
      ? { apiKey, baseURL }
      : {
          apiKey,
        },
  );
  return client.chat.completions.create({
    model,
    messages: [{ role: 'system', content: QA_COPILOT_SYSTEM }, ...messages],
    max_tokens: 4096,
    temperature: 0.45,
  });
}

export async function runAgentChat(provider, rawMessages) {
  const messages = sanitizeTurns(rawMessages);
  if (!messages.length) {
    throw new Error('At least one user message is required');
  }
  if (messages[0].role !== 'user') {
    throw new Error('Conversation must start with a user message');
  }

  if (provider === 'openai') {
    const completion = await openaiCompatibleChat({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_AGENT_MODEL,
      messages,
    });
    return completion.choices[0].message.content || '';
  }

  if (provider === 'groq') {
    const completion = await openaiCompatibleChat({
      apiKey: GROQ_API_KEY,
      baseURL: GROQ_AGENT_BASE,
      model: GROQ_AGENT_MODEL,
      messages,
    });
    return completion.choices[0].message.content || '';
  }

  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: GEMINI_AGENT_MODEL,
      systemInstruction: QA_COPILOT_SYSTEM,
    });
    const history = [];
    for (let i = 0; i < messages.length - 1; i++) {
      const m = messages[i];
      history.push({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      });
    }
    const last = messages[messages.length - 1];
    if (last.role !== 'user') {
      throw new Error('Last message must be from user');
    }
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(last.content);
    return result.response.text() || '';
  }

  throw new Error(`Agent chat not implemented for provider: ${provider}`);
}
