import { initI18n, t, getOtherLang, setLang, onLangChange } from './i18n.js';
import { loadCatalog } from './data.js';
import { initDebug, mountDebugPanel, debugLog } from './debug.js';
import { initForm } from './ui/form.js';
import { renderResult, renderStatus } from './ui/results.js';
import { recommend, MIXES_PER_PAGE } from './engine/recommend.js';

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
  const moreButton = document.getElementById('more-button');

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
      renderResult(resultsContainer, state.result, catalog);
    }
    moreButton.hidden = state.status !== null || !state.result || state.result.mixes.length < MIXES_PER_PAGE;
  };

  const loadPage = async (request, page) => {
    const startedAt = performance.now();
    try {
      const result = await recommend(request, catalog, page);
      debugLog(`Request "${request.query}" page ${page} → ${result.mixes.length} mixes in ${Math.round(performance.now() - startedAt)} ms`);
      debugLog(`Profile: ${describeProfile(result.profile)}`);
      Object.assign(state, { request, page, result, status: null });
    } catch (error) {
      debugLog(error.stack || error.message, 'error');
      Object.assign(state, { request, page, result: null, status: 'error_engine' });
    }
    render();
  };

  const form = initForm({
    form: document.getElementById('mix-form'),
    onSubmit: async (request) => {
      moreButton.hidden = true;
      renderStatus(resultsContainer, 'loading');
      await loadPage(request, 0);
    },
  });

  moreButton.addEventListener('click', async () => {
    moreButton.disabled = true;
    await loadPage(state.request, state.page + 1);
    moreButton.disabled = false;
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  ].join(' | ');
}

main().catch((error) => {
  debugLog(error.stack || error.message, 'error');
});
