import fs from 'fs';
import path from 'path';
import { historyDir } from './paths.js';

const SAFE_NAME = /^[a-zA-Z0-9._-]+\.json$/;

export function assertSafeHistoryFilename(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid filename');
  }
  const base = path.basename(name);
  if (base !== name || !SAFE_NAME.test(base)) {
    throw new Error('Invalid history file name');
  }
  return base;
}

export function listHistorySummaries() {
  if (!fs.existsSync(historyDir)) {
    return [];
  }
  const files = fs
    .readdirSync(historyDir)
    .filter((f) => SAFE_NAME.test(f))
    .map((filename) => {
      const full = path.join(historyDir, filename);
      const stat = fs.statSync(full);
      let featureName = '';
      let caseCount = 0;
      let provider = '';
      let timestamp = '';
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
        featureName = raw.featureName || '';
        provider = raw.provider || '';
        timestamp = raw.timestamp || stat.mtime.toISOString();
        caseCount = Array.isArray(raw.testCases) ? raw.testCases.length : 0;
      } catch {
        timestamp = stat.mtime.toISOString();
      }
      return {
        filename,
        updatedAt: stat.mtime.toISOString(),
        timestamp,
        featureName,
        caseCount,
        provider,
      };
    });
  files.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return files;
}

export function readHistoryRecord(filename) {
  const safe = assertSafeHistoryFilename(filename);
  const full = path.join(historyDir, safe);
  if (!fs.existsSync(full)) {
    throw new Error('File not found');
  }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}
