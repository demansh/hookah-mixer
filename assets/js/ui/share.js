import { t } from '../i18n.js';
import { mixToParams, mixShareText } from '../mix-link.js';
import { showToast } from './toast.js';
import { debugLog } from '../debug.js';

export function mixUrl(mix, query, baseUrl) {
  return `${location.origin}${baseUrl}/?${mixToParams(mix, query).toString().replace(/%2C/gi, ',')}`;
}

export async function shareMix(mix, query, catalog, baseUrl) {
  const url = mixUrl(mix, query, baseUrl);
  const text = mixShareText(mix, catalog);
  const payload = { title: t('share_title'), text, url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(payload))) {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      debugLog(`Share failed: ${error.message}`, 'error');
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    showToast(t('copied_toast'));
  } catch (error) {
    debugLog(`Clipboard failed: ${error.message}`, 'error');
    showToast(url, { duration: 8000 });
  }
}
