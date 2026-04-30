import OpenAI from 'openai';
import fs from 'fs';
import { GROQ_API_KEY } from '../config/env.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/testCasePrompt.js';
import { parseAiJsonResponse } from '../utils/parseAiJson.js';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

/** Text chat default; vision when screenshots exist (Groq vision model). */
function pickModel(hasImages) {
  if (process.env.GROQ_MODEL) {
    return process.env.GROQ_MODEL;
  }
  return hasImages
    ? process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview'
    : process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
}

export async function generateWithGroq({
  featureName,
  platform,
  requirements,
  screenshots,
  depth,
  includeNonFunctional,
  requirementContext,
}) {
  const hasImages = Boolean(screenshots && screenshots.length);
  const model = pickModel(hasImages);

  const client = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: GROQ_BASE,
  });

  const systemPrompt = buildSystemPrompt();
  const userText = buildUserPrompt({
    featureName,
    platform,
    requirements,
    depth,
    includeNonFunctional,
    requirementContext,
  });

  const userContent = [{ type: 'text', text: userText }];

  for (const screenshot of screenshots) {
    const imageBuffer = fs.readFileSync(screenshot.path);
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${screenshot.mimetype};base64,${imageBuffer.toString('base64')}`,
      },
    });
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ];
  const base = {
    model,
    messages,
    max_tokens: 8192,
    temperature: 0.35,
  };

  let completion;
  try {
    completion = await client.chat.completions.create({
      ...base,
      response_format: { type: 'json_object' },
    });
  } catch (firstErr) {
    const msg = String(firstErr?.message || '').toLowerCase();
    const retry =
      firstErr?.status === 400 ||
      msg.includes('response_format') ||
      msg.includes('json_object');
    if (!retry) {
      throw firstErr;
    }
    completion = await client.chat.completions.create(base);
  }

  const responseText = completion.choices[0].message.content;
  return parseAiJsonResponse(responseText);
}
