import { t } from './i18n.js';

const MAX_LOG_ENTRIES = 200;

let logList = null;
const pendingEntries = [];

export function isDebugEnabled() {
  return new URLSearchParams(location.search).get('debug') === '1';
}

export function initDebug() {
  if (!isDebugEnabled()) {
    return;
  }
  window.addEventListener('error', (event) => {
    debugLog(`${event.message} @ ${event.filename}:${event.lineno}`, 'error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    debugLog(`Unhandled rejection: ${event.reason?.stack || event.reason}`, 'error');
  });
}

export function mountDebugPanel(buildId) {
  if (!isDebugEnabled()) {
    return;
  }
  const panel = document.createElement('section');
  panel.className = 'debug-panel';

  const header = document.createElement('div');
  header.className = 'debug-panel-header';
  const title = document.createElement('strong');
  title.textContent = `${t('debug_title')} · ${buildId}`;
  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = t('debug_reset');
  resetButton.addEventListener('click', resetCachesAndReload);
  header.append(title, resetButton);

  logList = document.createElement('ul');
  logList.className = 'debug-log';
  panel.append(header, logList);
  document.body.append(panel);
  document.body.classList.add('has-debug-panel');

  debugLog(`UA: ${navigator.userAgent}`);
  debugLog(`WebGPU: ${'gpu' in navigator}, SW: ${'serviceWorker' in navigator}`);
  pendingEntries.splice(0).forEach(appendEntry);
}

export function debugLog(message, level = 'info') {
  if (!isDebugEnabled()) {
    return;
  }
  const entry = { message: String(message), level, time: new Date().toLocaleTimeString() };
  if (level === 'error') {
    console.error(entry.message);
  }
  if (logList) {
    appendEntry(entry);
  } else {
    pendingEntries.push(entry);
  }
}

function appendEntry({ message, level, time }) {
  const item = document.createElement('li');
  item.textContent = `${time} ${message}`;
  if (level === 'error') {
    item.className = 'debug-log-error';
  }
  logList.prepend(item);
  while (logList.children.length > MAX_LOG_ENTRIES) {
    logList.lastElementChild.remove();
  }
}

async function resetCachesAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } catch (error) {
    debugLog(`Cache reset failed: ${error.message}`, 'error');
  }
  location.reload();
}
