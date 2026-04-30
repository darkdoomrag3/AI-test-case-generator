import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { GEMINI_API_KEY } from '../config/env.js';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/testCasePrompt.js';
import { parseAiJsonResponse } from '../utils/parseAiJson.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export async function generateWithGemini({
  featureName,
  platform,
  requirements,
  screenshots,
  depth,
  includeNonFunctional,
  requirementContext,
}) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt({
    featureName,
    platform,
    requirements,
    depth,
    includeNonFunctional,
    requirementContext,
  });

  const parts = [{ text: `${systemPrompt}\n\n${userPrompt}` }];

  for (const screenshot of screenshots) {
    const imageBuffer = fs.readFileSync(screenshot.path);
    parts.push({
      inlineData: {
        mimeType: screenshot.mimetype,
        data: imageBuffer.toString('base64'),
      },
    });
  }

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.35,
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.response.text();
  return parseAiJsonResponse(responseText);
}
