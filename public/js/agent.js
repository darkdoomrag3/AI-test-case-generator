'use strict';

let appConfig = null;
let messages = [];

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

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function renderChat() {
  const log = document.getElementById('chatLog');
  log.innerHTML = messages
    .map(
      (m) => `
    <div class="chat-msg ${m.role}">
      <div class="chat-meta">${m.role === 'user' ? 'You' : 'Copilot'}</div>
      ${escapeHtml(m.content)}
    </div>`,
    )
    .join('');
  log.scrollTop = log.scrollHeight;
}

document.getElementById('btnClear').addEventListener('click', () => {
  messages = [];
  renderChat();
});

document.getElementById('btnSend').addEventListener('click', async () => {
  const input = document.getElementById('userInput');
  const text = input.value.trim();
  if (!text) {
    showToast('Enter a message', 'error');
    return;
  }
  if (!appConfig?.ok) {
    showToast('AI not configured', 'error');
    return;
  }

  messages.push({ role: 'user', content: text });
  input.value = '';
  renderChat();

  const payload = { messages };
  if (appConfig && countEnabledProviders(appConfig.providers) > 1) {
    payload.provider = document.getElementById('providerSelect').value;
  }

  document.getElementById('btnSend').disabled = true;
  try {
    const response = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }
    messages.push({ role: 'assistant', content: data.reply || '(empty reply)' });
    renderChat();
  } catch (e) {
    messages.pop();
    renderChat();
    showToast(e.message || 'Chat failed', 'error');
  } finally {
    document.getElementById('btnSend').disabled = false;
  }
});

loadConfig();
