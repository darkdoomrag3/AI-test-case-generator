import OpenAI from 'openai';
import fs from 'fs';
import { OPENAI_API_KEY } from '../config/env.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/testCasePrompt.js';
import { parseAiJsonResponse } from '../utils/parseAiJson.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export async function generateWithOpenAI({
  featureName,
  platform,
  requirements,
  screenshots,
  depth,
  includeNonFunctional,
  requirementContext,
}) {
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

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

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 8192,
    temperature: 0.35,
    response_format: { type: 'json_object' },
  });

  const responseText = completion.choices[0].message.content;
  return parseAiJsonResponse(responseText);
}
