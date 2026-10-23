import { initI18n, t, getOtherLang, setLang, onLangChange } from './i18n.js';
import { loadCatalog } from './data.js';
import { initDebug, mountDebugPanel, debugLog } from './debug.js';
import { initForm } from './ui/form.js';
import { renderMixes, renderStatus } from './ui/results.js';
import { recommend } from './engine/recommend.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const buildId = document.documentElement.dataset.build || 'local';

async function main() {
  initDebug();
  initI18n();
  mountDebugPanel(buildId);
  document.getElementById('build-id').textContent = buildId;

  const langToggle = document.getElementById('lang-toggle');
  const updateLangToggle = () => {
    langToggle.textContent = t('lang_switch');
  };
  langToggle.addEventListener('click', () => setLang(getOtherLang()));
  updateLangToggle();

  const resultsContainer = document.getElementById('results');

  let catalog;
  try {
    catalog = await loadCatalog(baseUrl);
    debugLog(`Catalog: ${catalog.brands.length} brands, ${catalog.tobaccos.length} tobaccos, ${catalog.tags.length} tags`);
  } catch (error) {
    debugLog(error.message, 'error');
    renderStatus(resultsContainer, 'error_data');
    return;
  }

  let lastResult = null;

  const form = initForm({
    form: document.getElementById('mix-form'),
    brands: catalog.brands,
    onSubmit: async (request) => {
      renderStatus(resultsContainer, 'loading');
      const startedAt = performance.now();
      try {
        const mixes = await recommend(request, catalog);
        debugLog(`Request ${JSON.stringify(request)} → ${mixes.length} mixes in ${Math.round(performance.now() - startedAt)} ms`);
        lastResult = { status: null, mixes };
        renderMixes(resultsContainer, mixes, catalog);
      } catch (error) {
        debugLog(error.stack || error.message, 'error');
        lastResult = { status: 'error_engine', mixes: [] };
        renderStatus(resultsContainer, 'error_engine');
      }
    },
  });

  onLangChange(() => {
    updateLangToggle();
    form.refresh();
    if (lastResult?.status) {
      renderStatus(resultsContainer, lastResult.status);
    } else if (lastResult) {
      renderMixes(resultsContainer, lastResult.mixes, catalog);
    }
  });
}

main().catch((error) => {
  debugLog(error.stack || error.message, 'error');
});
