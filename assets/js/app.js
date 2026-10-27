import { loadCatalog, recommendSelection, createSessionSeed } from '../core/js/index.js';
import {
  createStartState, readState, writeState, toSelection, isMixScreen, startMix, canPin, pinFlavor, unpinFlavor,
  removeFromMix, includeFlavor, nextPage, withPage, setTemperature, hasLock, withoutLock, startFlavorMix, setStartTab,
  isFlavorSource, startShelfMix, isShelfSource,
} from './state.js';
import { renderStart, renderMix, renderThermometer, renderBottomActions, conceptLabel } from './render.js';
import { loadShelf, saveShelf, shelfExclusions } from './shelf.js';
import { TEMPERATURES } from './options.js';
import { resolveMood, showMaster } from './master.js';
import { initLang, toggleLang, t } from './i18n.js';
import { CONCEPT_ORDER } from './concept-emoji.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const tierOrder = TEMPERATURES.map((temperature) => temperature.tier);
const MAX_UNSEEN_ATTEMPTS = 12;
const MAX_LOCK_PAGES = 5;

const screenElement = document.getElementById('screen');
const thermometerElement = document.getElementById('thermometer');
const bottomActionsElement = document.getElementById('bottom-actions');
const masterElement = document.getElementById('master');
const langToggleElement = document.getElementById('lang-toggle');
const statusElement = document.getElementById('status');

let catalog = null;
let sessionSeed = createSessionSeed();
let orderedConcepts = [];
let shelf = new Set();
let state = createStartState();
let renderRevision = 0;
let currentMix = null;
let heldMix = null;
const seenMixKeys = new Set();

const actions = {
  onPickConcept: (conceptId) => update(startMix(state, conceptId), { resetSeen: true }),
  onSurprise: () => update(startMix(state, null), { resetSeen: true }),
  onPickFlavor: (flavorId) => update(startFlavorMix(state, flavorId), { resetSeen: true }),
  onToggleShelf: (flavorId) => toggleShelfFlavor(flavorId),
  onShelfMix: () => update(startShelfMix(state), { resetSeen: true }),
  onSetStartTab: (startTab) => update(setStartTab(state, startTab), { replace: true }),
  onPin: (flavorId) => holdMix(pinFlavor(state, flavorId)),
  onUnpin: (flavorId) => holdMix(unpinFlavor(state, flavorId)),
  onExclude: (flavorId) => removeFlavor(flavorId),
  onInclude: (flavorId) => update(includeFlavor(state, flavorId), { resetSeen: true }),
  onAnother: () => showAnotherMix(),
  onReset: () => resetProgress(),
  onSetTemperature: (tier) => update(setTemperature(state, tier), { replace: true, keepScroll: true }),
};

async function main() {
  initLang();
  renderLangToggle();
  langToggleElement.addEventListener('click', () => {
    toggleLang();
    renderLangToggle();
    if (catalog) {
      render();
    }
  });
  try {
    catalog = await loadCatalog(`${baseUrl}/assets/core/data`);
  } catch (error) {
    console.error(error);
    showStatus(t('loadError'));
    return;
  }
  orderedConcepts = orderConcepts(catalog.concepts);
  shelf = loadShelf(catalog);
  state = readState(window.location.search, catalog);
  window.addEventListener('popstate', () => {
    const nextState = readState(window.location.search, catalog);
    const keepsStartTab = isMixScreen(nextState) && !nextState.source;
    state = keepsStartTab ? { ...nextState, startTab: state.startTab } : nextState;
    heldMix = null;
    seenMixKeys.clear();
    render();
  });
  render();
}

function resetProgress() {
  sessionSeed = createSessionSeed();
  update(createStartState(state.temperature, state.startTab), { resetSeen: true });
}

function removeFlavor(flavorId) {
  const shownMix = heldMix ?? currentMix;
  const mixFlavorIds = shownMix ? shownMix.components.map((component) => component.flavorId) : [];
  update(removeFromMix(state, flavorId, mixFlavorIds), { resetSeen: true });
}

function holdMix(nextState) {
  if (nextState === state) {
    return;
  }
  heldMix = heldMix ?? currentMix;
  state = nextState;
  saveUrl(false);
  render();
}

function showAnotherMix() {
  if (heldMix) {
    heldMix = null;
    render({ preferUnseen: true });
    return;
  }
  update(nextPage(state), { preferUnseen: true });
}

function renderLangToggle() {
  langToggleElement.textContent = t('langSwitch');
  langToggleElement.setAttribute('aria-label', t('langSwitchLabel'));
  langToggleElement.title = t('langSwitchLabel');
}

function update(nextState, { replace = false, keepScroll = false, resetSeen = false, preferUnseen = false } = {}) {
  if (nextState === state) {
    return;
  }
  heldMix = null;
  if (resetSeen) {
    seenMixKeys.clear();
  }
  state = nextState;
  saveUrl(replace);
  render({ preferUnseen });
  if (!keepScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function saveUrl(replace) {
  const url = `${window.location.pathname}${writeState(state)}`;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

async function render({ preferUnseen = false } = {}) {
  const revision = ++renderRevision;
  renderThermometer(thermometerElement, state.temperature, actions);
  const bottomView = { isMixScreen: isMixScreen(state), startTab: state.startTab, shelfSize: shelf.size };
  renderBottomActions(bottomActionsElement, bottomView, actions);
  if (!isMixScreen(state)) {
    currentMix = null;
    showStatus(null);
    showMaster(masterElement, resolveMood({ temperature: state.temperature }));
    renderStart(screenElement, { concepts: orderedConcepts, catalog, startTab: state.startTab, shelf }, actions);
    return;
  }
  if (heldMix) {
    showMaster(masterElement, resolveMood({ temperature: state.temperature }));
    renderMixCard(heldMix);
    return;
  }
  try {
    let { mix, page, wrapped } = await loadForState(preferUnseen);
    const isLockFailed = !mix && hasLock(state);
    if (isLockFailed) {
      ({ mix, page, wrapped } = await loadMix(state.page, withoutLock(state)));
    }
    if (revision !== renderRevision) {
      return;
    }
    if (isLockFailed) {
      state = withoutLock(state);
      saveUrl(true);
    }
    if (wrapped) {
      seenMixKeys.clear();
    }
    if (mix) {
      seenMixKeys.add(mixKey(mix));
    }
    if (page !== state.page) {
      state = withPage(state, page);
      saveUrl(true);
    }
    currentMix = mix;
    showStatus(null);
    const mood = resolveMood({ hasMix: Boolean(mix), wrapped, temperature: state.temperature });
    showMaster(masterElement, mood);
    renderMixCard(mix);
  } catch (error) {
    console.error(error);
    showStatus(t('engineError'));
  }
}

function toggleShelfFlavor(flavorId) {
  if (shelf.has(flavorId)) {
    shelf.delete(flavorId);
  } else {
    shelf.add(flavorId);
  }
  saveShelf(shelf);
  render();
}

function selectionFor(fromState) {
  const selection = toSelection(fromState);
  if (!isShelfSource(fromState)) {
    return selection;
  }
  const kept = new Set(selection.required);
  const outsideShelf = shelfExclusions(shelf, catalog).filter((flavorId) => !kept.has(flavorId));
  return { ...selection, excluded: [...new Set([...selection.excluded, ...outsideShelf])] };
}

function cardTitle() {
  if (isFlavorSource(state)) {
    return null;
  }
  if (isShelfSource(state)) {
    return t('fromShelf');
  }
  const concept = catalog.concepts.find((item) => item.id === state.conceptId);
  return concept ? conceptLabel(concept) : t('mastersChoice');
}

function renderMixCard(mix) {
  renderMix(screenElement, {
    state,
    catalog,
    mix,
    isFallbackTier: Boolean(mix) && mix.tier !== state.temperature,
    title: cardTitle(),
    nothingFoundKey: isShelfSource(state) ? 'shelfNothingFound' : 'nothingFound',
    canPin: canPin(state),
  }, actions);
}

async function loadMix(page, fromState = state) {
  const request = { ...selectionFor(fromState), seed: sessionSeed };
  const result = await recommendSelection(request, catalog, page);
  if (page > 0 && result.mixes.length === 0) {
    const firstPage = await recommendSelection(request, catalog, 0);
    return { mix: pickMix(firstPage.mixes, fromState.temperature), page: 0, wrapped: true };
  }
  return { mix: pickMix(result.mixes, fromState.temperature), page, wrapped: false };
}

function loadForState(preferUnseen) {
  if (hasLock(state)) {
    return loadLockedMix(state);
  }
  return preferUnseen ? loadUnseenMix(state.page) : loadMix(state.page);
}

async function loadLockedMix(fromState) {
  const request = { ...selectionFor(fromState), seed: sessionSeed };
  const maxSize = fromState.locked.length + 1;
  let fallbackMix = null;
  for (let page = 0; page < MAX_LOCK_PAGES; page += 1) {
    const { mixes } = await recommendSelection(request, catalog, page);
    const mix = pickMix(mixes, fromState.temperature);
    if (!mix) {
      break;
    }
    fallbackMix = fallbackMix ?? mix;
    if (mix.components.length <= maxSize) {
      return { mix, page: fromState.page, wrapped: false };
    }
  }
  return { mix: fallbackMix, page: fromState.page, wrapped: false };
}

async function loadUnseenMix(startPage) {
  let loaded = await loadMix(startPage);
  for (let attempt = 0; attempt < MAX_UNSEEN_ATTEMPTS; attempt += 1) {
    if (!loaded.mix || loaded.wrapped || !seenMixKeys.has(mixKey(loaded.mix))) {
      break;
    }
    loaded = await loadMix(loaded.page + 1);
  }
  const isOnlyRepeats = Boolean(loaded.mix) && seenMixKeys.has(mixKey(loaded.mix));
  return isOnlyRepeats ? { ...loaded, wrapped: true } : loaded;
}

function mixKey(mix) {
  return mix.components.map((component) => component.flavorId).sort().join('+');
}

function pickMix(mixes, tier) {
  const distance = (mix) => Math.abs(tierOrder.indexOf(mix.tier) - tierOrder.indexOf(tier));
  return [...mixes].sort((left, right) => distance(left) - distance(right))[0] ?? null;
}

function orderConcepts(concepts) {
  const rank = new Map(CONCEPT_ORDER.map((conceptId, index) => [conceptId, index]));
  const position = (concept) => rank.get(concept.id) ?? CONCEPT_ORDER.length;
  return concepts
    .map((concept, index) => ({ concept, index }))
    .sort((left, right) => position(left.concept) - position(right.concept) || left.index - right.index)
    .map(({ concept }) => concept);
}

function showStatus(message) {
  statusElement.hidden = message === null;
  statusElement.textContent = message ?? '';
}

main();
