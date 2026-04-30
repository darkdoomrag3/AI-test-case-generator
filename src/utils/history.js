import fs from 'fs';
import path from 'path';
import { historyDir } from './paths.js';

export function ensureHistoryDir() {
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
}

export function saveGenerationHistory({
  provider,
  featureName,
  requirements,
  suite,
  testCases,
}) {
  ensureHistoryDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `suite-${provider}-${timestamp}.json`;
  const filePath = path.join(historyDir, filename);
  const data = {
    timestamp: new Date().toISOString(),
    provider,
    featureName,
    requirements,
    suite,
    testCases,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filename;
}
