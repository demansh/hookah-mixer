import { mixToParams, mixShareText } from '../core/js/index.js';
import { t, getLang } from './i18n.js';
import { showToast } from './toast.js';

const TOAST_DURATION_MS = 3000;
const FALLBACK_TOAST_DURATION_MS = 8000;

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
    showToast(t('copied'), { duration: TOAST_DURATION_MS });
  } catch (error) {
    console.warn('Clipboard failed', error);
    showToast(url, { duration: FALLBACK_TOAST_DURATION_MS });
  }
}
