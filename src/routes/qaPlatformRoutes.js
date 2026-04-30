import express from 'express';
import { resolveActiveProvider } from '../config/env.js';
import { runAgentChat } from '../providers/agentChat.js';
import {
  runBugReportWorkflow,
  runCharterWorkflow,
  runChecklistWorkflow,
  runRiskWorkflow,
} from '../services/qaWorkflowService.js';
import {
  listHistorySummaries,
  readHistoryRecord,
} from '../utils/historyRead.js';

export function attachQaPlatformRoutes(router) {
  router.post('/agent/chat', express.json({ limit: '2mb' }), async (req, res) => {
    try {
      const { messages, provider: requested } = req.body;
      if (!Array.isArray(messages) || !messages.length) {
        return res.status(400).json({ error: 'messages array is required' });
      }
      const provider = resolveActiveProvider(
        requested ? String(requested).trim() || undefined : undefined,
      );
      const reply = await runAgentChat(provider, messages);
      res.json({ reply, provider });
    } catch (error) {
      console.error('Agent chat:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({ error: error.message || 'Agent failed' });
    }
  });

  router.post('/workflows/bug-report', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const p = resolveActiveProvider(
        req.body.provider ? String(req.body.provider).trim() || undefined : undefined,
      );
      const data = await runBugReportWorkflow(p, req.body);
      res.json({ provider: p, result: data });
    } catch (error) {
      console.error('Workflow bug-report:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({ error: error.message || 'Workflow failed' });
    }
  });

  router.post('/workflows/charter', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const p = resolveActiveProvider(
        req.body.provider ? String(req.body.provider).trim() || undefined : undefined,
      );
      const data = await runCharterWorkflow(p, req.body);
      res.json({ provider: p, result: data });
    } catch (error) {
      console.error('Workflow charter:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({ error: error.message || 'Workflow failed' });
    }
  });

  router.post('/workflows/release-checklist', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const p = resolveActiveProvider(
        req.body.provider ? String(req.body.provider).trim() || undefined : undefined,
      );
      const data = await runChecklistWorkflow(p, req.body);
      res.json({ provider: p, result: data });
    } catch (error) {
      console.error('Workflow checklist:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({ error: error.message || 'Workflow failed' });
    }
  });

  router.post('/workflows/risk-review', express.json({ limit: '1mb' }), async (req, res) => {
    try {
      const p = resolveActiveProvider(
        req.body.provider ? String(req.body.provider).trim() || undefined : undefined,
      );
      const data = await runRiskWorkflow(p, req.body);
      res.json({ provider: p, result: data });
    } catch (error) {
      console.error('Workflow risk:', error);
      const status =
        error.message?.includes('not configured') ||
        error.message?.includes('not set')
          ? 401
          : 500;
      res.status(status).json({ error: error.message || 'Workflow failed' });
    }
  });

  router.get('/history', (_req, res) => {
    try {
      const items = listHistorySummaries();
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/history/file/:name', (req, res) => {
    try {
      const record = readHistoryRecord(req.params.name);
      res.json(record);
    } catch (error) {
      const status = error.message === 'File not found' ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  });
}
