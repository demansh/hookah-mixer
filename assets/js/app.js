import { initI18n, t, localize, getOtherLang, setLang, onLangChange } from './i18n.js';
import { loadCatalog } from './data.js';
import { initDebug, mountDebugPanel, debugLog } from './debug.js';
import { initForm, normalizeQuery } from './ui/form.js';
import { removeSpans } from './engine/text.js';
import { renderResult, renderStatus } from './ui/results.js';
import { recommend } from './engine/recommend.js';
import { createSessionSeed } from './engine/random.js';
import { parseQuery } from './engine/profile.js';
import { resolveMood, createMoodIndicator } from './ui/mood.js';
import { initBottomBar } from './ui/bottom-bar.js';
import { noteForMix } from './engine/recommend.js';
import {
  listFavorites, favoritesCount, isFavorite, toggleFavorite, removeFavorite, restoreFavorite, onFavoritesChange,
} from './favorites.js';
import { readRoute, navigate, canGoBackInApp } from './router.js';
import { mixToParams, parseMixParams, mixFlavorQuery } from './mix-link.js';
import { renderMixView, renderFavoritesView } from './ui/views.js';
import { shareMix } from './ui/share.js';
import { showToast } from './ui/toast.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const buildId = document.documentElement.dataset.build || 'local';
const LIVE_MOOD_DELAY_MS = 120;
const sessionSeed = resolveSessionSeed();

async function main() {
  initDebug();
  registerServiceWorker();
  initI18n();
  initBottomBar(document.getElementById('mix-form'));
  mountDebugPanel(buildId);
  debugLog(`Seed: ${sessionSeed} (add ?seed=${sessionSeed} to reproduce)`);

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
      renderResult(resultsContainer, state.result, catalog, {
        flavorActions: { onInclude: includeFlavor, onExclude: excludeFlavor },
        mixActions: {
          onToggleFavorite: (mix) => toggleFavorite(mix, currentQuery()),
          onShare: (mix) => shareMix(mix, currentQuery(), catalog, baseUrl),
          onOpen: (mix) => openMix(mix, currentQuery()),
        },
      });
    }
    document.getElementById('empty-state').hidden = state.result !== null || state.status !== null;
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formElement = document.getElementById('mix-form');
  const queryInput = document.getElementById('query-input');

  function excludeFlavor(flavorId) {
    if (state.result?.profile.excluded.has(flavorId)) {
      return;
    }
    const addition = `${t('without')} ${localize(catalog.flavorsById.get(flavorId).label)}`;
    const pinnedSpans = parseQuery(queryInput.value, catalog).matched
      .filter((match) => match.type === 'flavor' && match.id === flavorId && !match.negated)
      .flatMap((match) => match.spans);
    const currentQuery = pinnedSpans.length > 0 ? removeSpans(queryInput.value, pinnedSpans) : queryInput.value.trim();
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

  const mainElements = [document.querySelector('.app-main'), formElement];
  const mixView = document.getElementById('mix-view');
  const favoritesView = document.getElementById('favorites-view');
  const favoritesButton = document.getElementById('favorites-button');
  const favoritesCountBadge = document.getElementById('favorites-count');

  function currentQuery() {
    return state.request?.query ?? '';
  }

  function openMix(mix, query) {
    navigate(mixToParams(mix, query));
    renderRoute();
  }

  function goBack() {
    if (canGoBackInApp()) {
      history.back();
      return;
    }
    navigate(new URLSearchParams(), { replace: true });
    renderRoute();
  }

  function withNote(mix) {
    return { ...mix, note: noteForMix(mix, catalog) };
  }

  function renderRoute() {
    const route = readRoute();
    mainElements.forEach((element) => {
      element.hidden = route.view !== 'main';
    });
    mixView.hidden = route.view !== 'mix';
    favoritesView.hidden = route.view !== 'favorites';
    window.scrollTo(0, 0);
    if (route.view === 'mix') {
      const parsed = parseMixParams(route.params, catalog);
      const mix = parsed ? withNote(parsed.mix) : null;
      renderMixView(mixView, {
        catalog,
        mix,
        query: parsed?.query ?? '',
        isFavorite: mix ? isFavorite(mix.components) : false,
        onToggleFavorite: () => toggleFavorite(mix, parsed.query),
        onShare: () => shareMix(mix, parsed.query, catalog, baseUrl),
        onSimilar: () => {
          queryInput.value = mixFlavorQuery(mix, catalog);
          navigate(new URLSearchParams());
          renderRoute();
          formElement.requestSubmit();
        },
        onBack: goBack,
      });
    } else if (route.view === 'favorites') {
      renderFavoritesView(favoritesView, {
        catalog,
        items: listFavorites().map((item) => ({ mix: withNote(item), query: item.query })),
        onOpen: (mix, query) => openMix(mix, query),
        onShare: (mix, query) => shareMix(mix, query, catalog, baseUrl),
        onDelete: (mix) => {
          const removed = removeFavorite(mix.components);
          if (removed) {
            showToast(t('deleted_toast'), { actionLabel: t('undo'), onAction: () => restoreFavorite(removed) });
          }
        },
        onBack: goBack,
      });
    } else {
      render();
    }
  }

  function updateFavoritesBadge() {
    const count = favoritesCount();
    favoritesCountBadge.textContent = count > 0 ? String(count) : '';
    favoritesCountBadge.hidden = count === 0;
    favoritesButton.setAttribute('aria-label', `${t('favorites_open')}${count > 0 ? ` (${count})` : ''}`);
    favoritesButton.title = t('favorites_open');
  }

  favoritesButton.addEventListener('click', () => {
    if (readRoute().view === 'favorites') {
      return;
    }
    navigate(new URLSearchParams({ view: 'favorites' }));
    renderRoute();
  });

  onFavoritesChange(() => {
    updateFavoritesBadge();
    if (readRoute().view === 'favorites') {
      renderRoute();
    }
  });

  window.addEventListener('popstate', renderRoute);
  updateFavoritesBadge();
  renderRoute();

  onLangChange(() => {
    mood.refresh();
    updateLangToggle();
    updateFavoritesBadge();
    form.refresh();
    renderRoute();
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
