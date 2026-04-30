'use strict';

let generatedTestCases = [];
let generatedSuite = {};
let lastProvider = '';
let appConfig = null;

function escapeHtml(s) {
  if (s == null) {
    return '';
  }
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function priorityBadgeClass(p) {
  const x = String(p || '').toLowerCase();
  if (x === 'critical') {
    return 'badge-critical';
  }
  if (x === 'high') {
    return 'badge-high';
  }
  if (x === 'low') {
    return 'badge-low';
  }
  return 'badge-medium';
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
    status.textContent = `Ready — default: ${appConfig.activeProvider}`;
    status.className = 'config-status ok';
    fillProviderSelect(appConfig.providers, appConfig.activeProvider);
  } catch {
    status.textContent = 'Could not reach /api/config';
    status.className = 'config-status bad';
    sel.style.display = 'none';
  }
}

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('screenshots');
const previewImages = document.getElementById('previewImages');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  fileInput.files = e.dataTransfer.files;
  showPreviews();
});

fileInput.addEventListener('change', showPreviews);

function showPreviews() {
  previewImages.innerHTML = '';
  for (const file of fileInput.files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      previewImages.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

document.getElementById('generateForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const requirements = document.getElementById('requirements').value.trim();
  if (!requirements) {
    showToast('Enter requirements / acceptance criteria', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('featureName', document.getElementById('featureName').value);
  formData.append('platform', document.getElementById('platform').value);
  formData.append('requirements', requirements);
  formData.append('depth', document.getElementById('depth').value);
  formData.append(
    'includeNonFunctional',
    document.getElementById('includeNonFunctional').checked ? 'true' : 'false',
  );
  formData.append(
    'requirementContext',
    document.getElementById('requirementContext').value,
  );

  if (appConfig && countEnabledProviders(appConfig.providers) > 1) {
    formData.append('provider', document.getElementById('providerSelect').value);
  }

  for (const file of fileInput.files) {
    formData.append('screenshots', file);
  }

  document.getElementById('loading').classList.add('active');
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('testCasesContent').style.display = 'none';
  document.getElementById('generateBtn').disabled = true;

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    generatedTestCases = Array.isArray(data.testCases) ? data.testCases : [];
    generatedSuite = data.suite && typeof data.suite === 'object' ? data.suite : {};
    lastProvider = data.provider || '';
    renderSuiteSummary();
    renderTestCases();
    showToast(
      `Generated ${generatedTestCases.length} cases${lastProvider ? ` (${lastProvider})` : ''}`,
      'success',
    );
  } catch (error) {
    showToast(error.message || 'Generation failed', 'error');
    document.getElementById('emptyState').style.display = 'block';
  } finally {
    document.getElementById('loading').classList.remove('active');
    document.getElementById('generateBtn').disabled = false;
  }
});

function renderSuiteSummary() {
  const el = document.getElementById('suiteSummary');
  const s = generatedSuite || {};
  const hasContent =
    s.summary ||
    (Array.isArray(s.assumptions) && s.assumptions.length) ||
    (Array.isArray(s.openQuestions) && s.openQuestions.length) ||
    (Array.isArray(s.risks) && s.risks.length);

  if (!hasContent) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  el.style.display = 'block';
  let html = '<h3>Suite overview</h3>';
  if (s.summary) {
    html += `<p>${escapeHtml(s.summary)}</p>`;
  }
  if (Array.isArray(s.assumptions) && s.assumptions.length) {
    html += '<p><strong>Assumptions</strong></p><ul>';
    s.assumptions.forEach((a) => {
      html += `<li>${escapeHtml(a)}</li>`;
    });
    html += '</ul>';
  }
  if (Array.isArray(s.openQuestions) && s.openQuestions.length) {
    html += '<p><strong>Open questions</strong></p><ul>';
    s.openQuestions.forEach((q) => {
      html += `<li>${escapeHtml(q)}</li>`;
    });
    html += '</ul>';
  }
  if (Array.isArray(s.risks) && s.risks.length) {
    html += '<p><strong>Risks</strong></p><ul>';
    s.risks.forEach((r) => {
      html += `<li>${escapeHtml(r)}</li>`;
    });
    html += '</ul>';
  }
  el.innerHTML = html;
}

function renderTestCases() {
  if (!generatedTestCases.length) {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('testCasesContent').style.display = 'none';
    return;
  }

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('testCasesContent').style.display = 'block';

  const stats = {
    total: generatedTestCases.length,
    critical: generatedTestCases.filter((tc) => tc.priority === 'Critical').length,
    high: generatedTestCases.filter((tc) => tc.priority === 'High').length,
    medium: generatedTestCases.filter((tc) => tc.priority === 'Medium').length,
    low: generatedTestCases.filter((tc) => tc.priority === 'Low').length,
  };

  document.getElementById('stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${stats.total}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color:#fca5a5;">${stats.critical}</div>
      <div class="stat-label">Critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color:#ef4444;">${stats.high}</div>
      <div class="stat-label">High</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color:#f59e0b;">${stats.medium}</div>
      <div class="stat-label">Medium</div>
    </div>
    <div class="stat-card">
      <div class="stat-number" style="color:#10b981;">${stats.low}</div>
      <div class="stat-label">Low</div>
    </div>
  `;

  const list = document.getElementById('testCasesList');
  list.innerHTML = generatedTestCases
    .map((tc) => {
      const steps = Array.isArray(tc.steps) ? tc.steps : [];
      const refs =
        Array.isArray(tc.requirementRefs) && tc.requirementRefs.length
          ? `<div class="test-case-section"><h4>Requirement refs</h4><p>${escapeHtml(tc.requirementRefs.join(', '))}</p></div>`
          : '';
      const tags =
        tc.tags && tc.tags.length
          ? `<div class="tags">${tc.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
          : '';
      const sev = tc.severity
        ? `<span class="badge badge-type">${escapeHtml(tc.severity)}</span>`
        : '';
      const cat = tc.category
        ? `<span class="badge badge-type">${escapeHtml(tc.category)}</span>`
        : '';
      const risk = tc.risk
        ? `<span class="badge badge-type">Risk: ${escapeHtml(tc.risk)}</span>`
        : '';
      const auto =
        tc.automation && typeof tc.automation === 'object'
          ? `<div class="test-case-section"><h4>Automation</h4><p>${escapeHtml(tc.automation.candidate === true ? 'Candidate — ' : tc.automation.candidate === false ? 'Not a candidate — ' : '')}${escapeHtml(tc.automation.notes || '')}</p></div>`
          : '';
      const testData = tc.testData
        ? `<div class="test-case-section"><h4>Test data</h4><p>${escapeHtml(tc.testData)}</p></div>`
        : '';
      const post = tc.postconditions
        ? `<div class="test-case-section"><h4>Postconditions</h4><p>${escapeHtml(tc.postconditions)}</p></div>`
        : '';

      return `
        <div class="test-case-card">
          <div class="test-case-header">
            <div>
              <div class="test-case-id">${escapeHtml(tc.id)}</div>
              <div class="test-case-title">${escapeHtml(tc.title)}</div>
            </div>
            <div class="test-case-badges">
              <span class="badge ${priorityBadgeClass(tc.priority)}">${escapeHtml(tc.priority || '')}</span>
              <span class="badge badge-type">${escapeHtml(tc.type || '')}</span>
              ${sev}${cat}${risk}
            </div>
          </div>
          ${refs}
          ${tc.preconditions ? `<div class="test-case-section"><h4>Preconditions</h4><p>${escapeHtml(tc.preconditions)}</p></div>` : ''}
          ${testData}
          <div class="test-case-section">
            <h4>Steps</h4>
            <ol class="steps-list">
              ${steps
                .map(
                  (step) => `
                <li>
                  <div class="step-content">
                    <span class="step-action">${escapeHtml(step.action)}</span>
                    <span class="step-expected">✓ ${escapeHtml(step.expected)}</span>
                  </div>
                </li>`,
                )
                .join('')}
            </ol>
          </div>
          <div class="test-case-section">
            <h4>Expected result</h4>
            <p>${escapeHtml(tc.expectedResult)}</p>
          </div>
          ${post}
          ${auto}
          ${tags}
        </div>`;
    })
    .join('');
}

async function postExport(path, filename, body) {
  if (!generatedTestCases.length) {
    showToast('Nothing to export', 'error');
    return;
  }
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }
    const blob = await response.blob();
    downloadBlob(blob, filename);
    showToast('Export ready', 'success');
  } catch (error) {
    showToast(error.message || 'Export failed', 'error');
  }
}

document.getElementById('btnCsv').addEventListener('click', () => {
  postExport('/api/export/csv', 'test-cases.csv', {
    testCases: generatedTestCases,
  });
});

document.getElementById('btnXml').addEventListener('click', () => {
  postExport('/api/export/xml', 'test-cases.xml', {
    testCases: generatedTestCases,
  });
});

document.getElementById('btnJson').addEventListener('click', () => {
  postExport('/api/export/json', 'test-suite.json', {
    suite: generatedSuite,
    testCases: generatedTestCases,
  });
});

document.getElementById('btnMd').addEventListener('click', () => {
  postExport('/api/export/md', 'test-suite.md', {
    suite: generatedSuite,
    testCases: generatedTestCases,
  });
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

loadConfig();
