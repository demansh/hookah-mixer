import { initI18n, t, localize, getOtherLang, setLang, onLangChange } from './i18n.js';
import { loadCatalog } from './data.js';
import { initDebug, mountDebugPanel, debugLog } from './debug.js';
import { initForm } from './ui/form.js';
import { renderResult, renderStatus } from './ui/results.js';
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
    const flavorCount = catalog.flavors.filter((flavor) => flavor.kind === 'flavor').length;
    debugLog(`Catalog: ${flavorCount} flavors, ${catalog.graph.pairs.length} pairs, ${catalog.concepts.length} concepts`);
  } catch (error) {
    debugLog(error.message, 'error');
    renderStatus(resultsContainer, 'error_data');
    return;
  }

  const state = { request: null, page: 0, result: null, status: null };

  const render = () => {
    if (state.status) {
      renderStatus(resultsContainer, state.status);
    } else if (state.result) {
      renderResult(resultsContainer, state.result, catalog, excludeFlavor);
    }
  };

  const loadPage = async (request, page) => {
    const startedAt = performance.now();
    try {
      let result = await recommend(request, catalog, page);
      let loadedPage = page;
      if (page > 0 && result.mixes.length === 0) {
        loadedPage = 0;
        result = await recommend(request, catalog, loadedPage);
      }
      debugLog(`Request "${request.query}" page ${loadedPage} → ${result.mixes.length} mixes in ${Math.round(performance.now() - startedAt)} ms`);
      debugLog(`Profile: ${describeProfile(result.profile)}`);
      Object.assign(state, { request, page: loadedPage, result, status: null });
    } catch (error) {
      debugLog(error.stack || error.message, 'error');
      Object.assign(state, { request, page, result: null, status: 'error_engine' });
    }
    render();
  };

  const formElement = document.getElementById('mix-form');
  const queryInput = document.getElementById('query-input');

  function excludeFlavor(flavorId) {
    if (state.result?.profile.excluded.has(flavorId)) {
      return;
    }
    const addition = `${t('without')} ${localize(catalog.flavorsById.get(flavorId).label)}`;
    const currentQuery = queryInput.value.trim();
    queryInput.value = currentQuery ? `${currentQuery}, ${addition}` : addition;
    queryInput.scrollLeft = queryInput.scrollWidth;
    debugLog(`Exclude ${flavorId} → "${queryInput.value}"`);
    formElement.requestSubmit();
  }

  const form = initForm({
    form: formElement,
    onSubmit: async (request) => {
      const isRepeat = state.result !== null && state.request?.query.toLowerCase() === request.query.toLowerCase();
      if (!isRepeat) {
        renderStatus(resultsContainer, 'loading');
      }
      await loadPage(request, isRepeat ? state.page + 1 : 0);
    },
  });

  onLangChange(() => {
    updateLangToggle();
    form.refresh();
    render();
  });
}

function describeProfile(profile) {
  const formatMap = (map) => [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([id, weight]) => `${id}:${weight}`)
    .join(' ');
  return [
    `matched=${profile.matched.map((match) => `${match.negated ? '-' : ''}${match.type}:${match.id}`).join(' ')}`,
    `weights=${formatMap(profile.weights)}`,
    `properties=${formatMap(profile.properties)}`,
    `required=${profile.required.join(' ')}`,
    `excluded=${[...profile.excluded].join(' ')}`,
    `random=${profile.isRandom ? 'yes' : 'no'}`,
  ].join(' | ');
}

main().catch((error) => {
  debugLog(error.stack || error.message, 'error');
});
