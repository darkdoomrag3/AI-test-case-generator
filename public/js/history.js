'use strict';

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

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

async function loadList() {
  const body = document.getElementById('histBody');
  body.innerHTML = '';
  try {
    const response = await fetch('/api/history');
    const data = await response.json();
    const items = data.items || [];
    if (!items.length) {
      body.innerHTML =
        '<tr><td colspan="5">No saved suites yet. Generate from <a href="/generator" style="color:#93c5fd;">Suite generator</a>.</td></tr>';
      return;
    }
    items.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(row.updatedAt || '')}</td>
        <td>${escapeHtml(row.featureName || '—')}</td>
        <td>${row.caseCount ?? 0}</td>
        <td>${escapeHtml(row.provider || '')}</td>
        <td><button type="button" class="linkish" data-file="${escapeHtml(row.filename)}">View</button></td>`;
      body.appendChild(tr);
    });
    body.querySelectorAll('button[data-file]').forEach((b) => {
      b.addEventListener('click', () => {
        const name = b.getAttribute('data-file');
        loadDetail(name);
      });
    });
  } catch {
    showToast('Could not load history', 'error');
  }
}

async function loadDetail(filename) {
  const detail = document.getElementById('histDetail');
  const pre = document.getElementById('histDetailPre');
  const title = document.getElementById('histDetailTitle');
  detail.style.display = 'block';
  pre.textContent = 'Loading…';
  try {
    const response = await fetch(
      '/api/history/file/' + encodeURIComponent(filename),
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Failed (${response.status})`);
    }
    title.textContent = data.featureName || filename;
    pre.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    pre.textContent = e.message || 'Error';
    showToast(e.message || 'Load failed', 'error');
  }
}

document.getElementById('btnRefresh').addEventListener('click', loadList);

loadList();
