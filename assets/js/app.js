import { initI18n, t, localize, getOtherLang, setLang, onLangChange } from './i18n.js';
import { loadCatalog } from './data.js';
import { initDebug, mountDebugPanel, debugLog } from './debug.js';
import { initForm, normalizeQuery } from './ui/form.js';
import { renderResult, renderStatus } from './ui/results.js';
import { recommend } from './engine/recommend.js';
import { createSessionSeed } from './engine/random.js';
import { parseQuery } from './engine/profile.js';
import { resolveMood, createMoodIndicator } from './ui/mood.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const buildId = document.documentElement.dataset.build || 'local';
const LIVE_MOOD_DELAY_MS = 120;
const sessionSeed = resolveSessionSeed();

async function main() {
  initDebug();
  registerServiceWorker();
  initI18n();
  mountDebugPanel(buildId);
  debugLog(`Seed: ${sessionSeed} (add ?seed=${sessionSeed} to reproduce)`);
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

  const state = { request: null, page: 0, result: null, status: null, repeatCount: 0 };
  const mood = createMoodIndicator(document.getElementById('mood'));
  mood.set('wizard');

  const render = () => {
    if (state.status) {
      renderStatus(resultsContainer, state.status);
    } else if (state.result) {
      renderResult(resultsContainer, state.result, catalog, { onInclude: includeFlavor, onExclude: excludeFlavor });
    }
  };

  const loadPage = async (request, page, repeatCount) => {
    const startedAt = performance.now();
    try {
      const seededRequest = { ...request, seed: sessionSeed };
      let result = await recommend(seededRequest, catalog, page);
      let loadedPage = page;
      const wrapped = page > 0 && result.mixes.length === 0;
      if (wrapped) {
        loadedPage = 0;
        result = await recommend(seededRequest, catalog, loadedPage);
      }
      mood.set(resolveMood({ query: request.query, profile: result.profile, repeatCount, wrapped }));
      debugLog(`Request "${request.query}" page ${loadedPage} → ${result.mixes.length} mixes in ${Math.round(performance.now() - startedAt)} ms`);
      debugLog(`Profile: ${describeProfile(result.profile)}`);
      Object.assign(state, { request, page: loadedPage, result, status: null, repeatCount });
    } catch (error) {
      debugLog(error.stack || error.message, 'error');
      mood.set('dizzy');
      Object.assign(state, { request, page, result: null, status: 'error_engine', repeatCount: 0 });
    }
    render();
    updateSubmitMode();
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

  function includeFlavor(flavorId) {
    if (state.result?.profile.required.includes(flavorId)) {
      return;
    }
    const label = localize(catalog.flavorsById.get(flavorId).label);
    const currentQuery = queryInput.value.trim();
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
    queryInput.value = currentQuery
      ? `${capitalizedLabel}, ${currentQuery.charAt(0).toLowerCase()}${currentQuery.slice(1)}`
      : capitalizedLabel;
    queryInput.scrollLeft = 0;
    debugLog(`Include ${flavorId} → "${queryInput.value}"`);
    formElement.requestSubmit();
  }

  const form = initForm({
    form: formElement,
    concepts: catalog.concepts,
    flavors: catalog.flavors,
    onSubmit: async (request) => {
      const isRepeat = state.result !== null && state.request?.query.toLowerCase() === request.query.toLowerCase();
      if (!isRepeat) {
        renderStatus(resultsContainer, 'loading');
      }
      await loadPage(request, isRepeat ? state.page + 1 : 0, isRepeat ? state.repeatCount + 1 : 0);
    },
  });

  function updateSubmitMode() {
    const isSameQuery = state.result !== null && state.request !== null
      && normalizeQuery(queryInput.value).toLowerCase() === state.request.query.toLowerCase();
    form.setSubmitMode(isSameQuery ? 'regenerate' : 'new');
  }

  let liveMoodTimer = null;
  queryInput.addEventListener('input', () => {
    updateSubmitMode();
    clearTimeout(liveMoodTimer);
    liveMoodTimer = setTimeout(() => {
      const query = queryInput.value;
      mood.set(resolveMood({ query, profile: parseQuery(query, catalog) }));
    }, LIVE_MOOD_DELAY_MS);
  });

  onLangChange(() => {
    mood.refresh();
    updateLangToggle();
    form.refresh();
    render();
  });
}

function resolveSessionSeed() {
  const seedParameter = new URLSearchParams(location.search).get('seed');
  return seedParameter !== null && /^\d+$/.test(seedParameter) ? Number(seedParameter) : createSessionSeed();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker.register(`${baseUrl}/sw.js`, { scope: `${baseUrl}/` })
    .then((registration) => debugLog(`Service worker: ${registration.active ? 'active' : 'installing'}`))
    .catch((error) => debugLog(`Service worker failed: ${error.message}`, 'error'));
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
