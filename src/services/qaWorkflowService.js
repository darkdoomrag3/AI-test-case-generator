import { runWorkflowJson } from './workflowJsonService.js';
import {
  bugReportWorkflowPrompt,
  exploratoryCharterPrompt,
  releaseChecklistPrompt,
  riskBrainstormPrompt,
} from '../prompts/workflowPrompts.js';

const WORKFLOW_SYSTEM =
  'You are a senior QA lead. Output only valid JSON as requested. No markdown fences or commentary outside JSON.';

export async function runBugReportWorkflow(provider, body) {
  const user = bugReportWorkflowPrompt(body);
  return runWorkflowJson(provider, WORKFLOW_SYSTEM, user);
}

export async function runCharterWorkflow(provider, body) {
  const user = exploratoryCharterPrompt(body);
  return runWorkflowJson(provider, WORKFLOW_SYSTEM, user);
}

export async function runChecklistWorkflow(provider, body) {
  const user = releaseChecklistPrompt(body);
  return runWorkflowJson(provider, WORKFLOW_SYSTEM, user);
}

export async function runRiskWorkflow(provider, body) {
  const user = riskBrainstormPrompt(body);
  return runWorkflowJson(provider, WORKFLOW_SYSTEM, user);
}
