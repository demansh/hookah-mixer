import { mixToParams, mixShareText } from '../core/js/index.js';
import { t, getLang } from './i18n.js';

const TOAST_DURATION_MS = 3000;
const FALLBACK_TOAST_DURATION_MS = 8000;

let hideTimer = null;

export function mixUrl(mix, baseUrl) {
  return `${window.location.origin}${baseUrl}/?${mixToParams(mix).toString().replace(/%2C/gi, ',')}`;
}

export async function shareMix(mix, catalog, baseUrl) {
  const url = mixUrl(mix, baseUrl);
  const text = mixShareText(mix, catalog, getLang());
  const payload = { title: 'Hookah Mixer', text, url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.warn('Share failed', error);
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast(t('copied'), TOAST_DURATION_MS);
  } catch (error) {
    console.warn('Clipboard failed', error);
    showToast(url, FALLBACK_TOAST_DURATION_MS);
  }
}

function showToast(message, duration) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
}
