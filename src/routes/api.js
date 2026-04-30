import express from 'express';
import fs from 'fs';
import {
  getProviderAvailability,
  resolveActiveProvider,
} from '../config/env.js';
import { saveGenerationHistory } from '../utils/history.js';
import { normalizeGenerationPayload } from '../utils/normalizePayload.js';
import { runGeneration } from '../services/generationService.js';
import {
  buildCsvRows,
  buildXmlDocument,
  buildMarkdownDocument,
} from './exportHelpers.js';
import { attachQaPlatformRoutes } from './qaPlatformRoutes.js';

function cleanupScreenshots(files) {
  for (const shot of files || []) {
    try {
      fs.unlinkSync(shot.path);
    } catch {
      /* ignore */
    }
  }
}

export function createApiRouter(upload) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'ai-test-case-generator' });
  });

  router.get('/config', (_req, res) => {
    try {
      const providers = getProviderAvailability();
      let active = null;
      try {
        active = resolveActiveProvider();
      } catch {
        active = null;
      }
      res.json({
        providers,
        activeProvider: active,
        ok: Boolean(active),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/generate', upload.array('screenshots', 8), async (req, res) => {
    const screenshots = req.files || [];

    try {
      const requirements = req.body.requirements?.trim();
      const featureName = req.body.featureName || '';
      const platform = req.body.platform || 'Web';
      const depth = req.body.depth || 'Comprehensive';
      const includeNonFunctional = req.body.includeNonFunctional === 'true';
      const requirementContext = req.body.requirementContext || '';
      const providerRequested = req.body.provider?.trim() || '';

      if (!requirements) {
        return res.status(400).json({ error: 'Product requirements are required' });
      }

      const provider = resolveActiveProvider(providerRequested || undefined);

      const raw = await runGeneration(provider, {
        featureName,
        platform,
        requirements,
        screenshots,
        depth,
        includeNonFunctional,
        requirementContext,
      });

      const { suite, testCases } = normalizeGenerationPayload(raw);

      saveGenerationHistory({
        provider,
        featureName,
        requirements,
        suite,
        testCases,
      });

      res.json({
        provider,
        suite,
        testCases,
      });
    } catch (error) {
      console.error('Generation Error:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({
        error: error.message || 'Generation failed',
      });
    } finally {
      cleanupScreenshots(screenshots);
    }
  });

  router.post('/export/csv', express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { testCases } = req.body;
      if (!testCases || !Array.isArray(testCases)) {
        return res.status(400).json({ error: 'testCases array is required' });
      }
      const csv = buildCsvRows(testCases);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=test-cases.csv',
      );
      res.send(csv);
    } catch (error) {
      console.error('CSV export:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/export/xml', express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { testCases } = req.body;
      if (!testCases || !Array.isArray(testCases)) {
        return res.status(400).json({ error: 'testCases array is required' });
      }
      const xml = buildXmlDocument(testCases);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=test-cases.xml',
      );
      res.send(xml);
    } catch (error) {
      console.error('XML export:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/export/json', express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { suite, testCases } = req.body;
      if (!testCases || !Array.isArray(testCases)) {
        return res.status(400).json({ error: 'testCases array is required' });
      }
      const payload = { suite: suite || {}, testCases };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=test-suite.json',
      );
      res.send(JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('JSON export:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/export/md', express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { suite, testCases } = req.body;
      if (!testCases || !Array.isArray(testCases)) {
        return res.status(400).json({ error: 'testCases array is required' });
      }
      const md = buildMarkdownDocument(suite, testCases);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=test-suite.md',
      );
      res.send(md);
    } catch (error) {
      console.error('Markdown export:', error);
      res.status(500).json({ error: error.message });
    }
  });

  attachQaPlatformRoutes(router);

  return router;
}
