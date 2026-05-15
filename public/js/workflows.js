'use strict';

let appConfig = null;

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function countEnabledProviders(providers) {
  if (!providers) {
    return 0;
  }
  let n = 0;
  if (providers.openai) {
    n++;
  }
  if (providers.groq) {
    n++;
  }
  if (providers.gemini) {
    n++;
  }
  return n;
}

function fillProviderSelect(providers, activeProvider) {
  const sel = document.getElementById('providerSelect');
  sel.innerHTML = '';
  const entries = [];
  if (providers.openai) {
    entries.push(['openai', 'OpenAI']);
  }
  if (providers.groq) {
    entries.push(['groq', 'Groq']);
  }
  if (providers.gemini) {
    entries.push(['gemini', 'Gemini']);
  }
  entries.forEach(([val, label]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = label;
    sel.appendChild(opt);
  });
  const first = entries[0]?.[0];
  const active = activeProvider && entries.some(([v]) => v === activeProvider)
    ? activeProvider
    : first;
  if (active) {
    sel.value = active;
  }
  sel.style.display = entries.length > 1 ? 'inline-block' : 'none';
}

async function loadConfig() {
  const status = document.getElementById('configStatus');
  const sel = document.getElementById('providerSelect');
  try {
    const response = await fetch('/api/config');
    appConfig = await response.json();
    if (!appConfig.ok) {
      status.textContent =
        'Configure OPENAI_API_KEY, GROQ_API_KEY, and/or GEMINI_API_KEY in .env';
      status.className = 'config-status bad';
      sel.style.display = 'none';
      sel.innerHTML = '';
      return;
    }
    status.textContent = `Ready - default: ${appConfig.activeProvider}`;
    status.className = 'config-status ok';
    fillProviderSelect(appConfig.providers, appConfig.activeProvider);
  } catch {
    status.textContent = 'Could not reach /api/config';
    status.className = 'config-status bad';
    sel.style.display = 'none';
  }
}

function providerPayload(extra) {
  const body = { ...extra };
  if (appConfig && countEnabledProviders(appConfig.providers) > 1) {
    body.provider = document.getElementById('providerSelect').value;
  }
  return body;
}

async function runWorkflow(path, body, preId, outId) {
  if (!appConfig?.ok) {
    showToast('AI not configured', 'error');
    return;
  }
  const pre = document.getElementById(preId);
  const out = document.getElementById(outId);
  out.style.display = 'block';
  pre.textContent = '…';
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(providerPayload(body)),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Failed (${response.status})`);
    }
    pre.textContent = JSON.stringify(data.result || data, null, 2);
    showToast('Done', 'success');
  } catch (e) {
    pre.textContent = e.message || 'Error';
    showToast(e.message || 'Workflow failed', 'error');
  }
}

document.querySelectorAll('[data-workflow]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-workflow');
    if (key === 'bug-report') {
      runWorkflow(
        '/api/workflows/bug-report',
        {
          summary: document.getElementById('bugSummary').value,
          stepsToReproduce: document.getElementById('bugSteps').value,
          expected: document.getElementById('bugExpected').value,
          actual: document.getElementById('bugActual').value,
          environment: document.getElementById('bugEnv').value,
        },
        'pre-bug',
        'out-bug',
      );
    } else if (key === 'charter') {
      runWorkflow(
        '/api/workflows/charter',
        {
          featureArea: document.getElementById('charterArea').value,
          mission: document.getElementById('charterMission').value,
          timebox: document.getElementById('charterTimebox').value,
          focus: document.getElementById('charterFocus').value,
        },
        'pre-charter',
        'out-charter',
      );
    } else if (key === 'release-checklist') {
      runWorkflow(
        '/api/workflows/release-checklist',
        {
          releaseName: document.getElementById('relName').value,
          scopeNotes: document.getElementById('relScope').value,
          riskNotes: document.getElementById('relRisk').value,
        },
        'pre-release',
        'out-release',
      );
    } else if (key === 'risk-review') {
      runWorkflow(
        '/api/workflows/risk-review',
        {
          context: document.getElementById('riskContext').value,
        },
        'pre-risk',
        'out-risk',
      );
    }
  });
});

loadConfig();
