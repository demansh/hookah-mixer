import { MAX_REQUIRED_FLAVORS, isIngredient } from '../core/js/index.js';
import { TEMPERATURES, DEFAULT_TEMPERATURE } from './options.js';

const temperatureTiers = new Set(TEMPERATURES.map((temperature) => temperature.tier));
const LIST_SEPARATOR = ',';
const MIX_SCREEN = 'mix';
const START_TABS = ['mood', 'taste'];
const DEFAULT_START_TAB = 'mood';
const FLAVOR_SOURCE = 'flavor';

export function createStartState(temperature = DEFAULT_TEMPERATURE, startTab = DEFAULT_START_TAB) {
  return {
    screen: 'start',
    startTab,
    source: null,
    conceptId: null,
    required: [],
    excluded: [],
    locked: [],
    page: 0,
    temperature,
  };
}

export function readState(search, catalog) {
  const params = new URLSearchParams(search);
  const temperature = temperatureTiers.has(params.get('t')) ? params.get('t') : DEFAULT_TEMPERATURE;
  if (params.get('s') !== MIX_SCREEN) {
    const startTab = START_TABS.includes(params.get('tab')) ? params.get('tab') : DEFAULT_START_TAB;
    return createStartState(temperature, startTab);
  }
  const conceptId = catalog.concepts.some((concept) => concept.id === params.get('c')) ? params.get('c') : null;
  const isKnownIngredient = (id) => isIngredient(catalog.flavorsById.get(id) ?? {});
  const required = unique(readList(params, 'keep').filter(isKnownIngredient)).slice(0, MAX_REQUIRED_FLAVORS);
  const excluded = unique(readList(params, 'drop').filter((id) => isKnownIngredient(id) && !required.includes(id)));
  const locked = unique(readList(params, 'lock').filter((id) => isKnownIngredient(id) && !excluded.includes(id)));
  const page = Math.max(0, Number.parseInt(params.get('p') ?? '0', 10) || 0);
  const source = params.get('from') === FLAVOR_SOURCE && !conceptId ? FLAVOR_SOURCE : null;
  return {
    screen: MIX_SCREEN,
    startTab: source === FLAVOR_SOURCE ? 'taste' : DEFAULT_START_TAB,
    source,
    conceptId,
    required,
    excluded,
    locked: lockedRequired(required, locked).length <= MAX_REQUIRED_FLAVORS ? locked : [],
    page,
    temperature,
  };
}

export function writeState(state) {
  const params = new URLSearchParams();
  if (state.screen === MIX_SCREEN) {
    params.set('s', MIX_SCREEN);
    if (state.conceptId) {
      params.set('c', state.conceptId);
    }
    if (state.source === FLAVOR_SOURCE) {
      params.set('from', FLAVOR_SOURCE);
    }
    writeList(params, 'keep', state.required);
    writeList(params, 'drop', state.excluded);
    writeList(params, 'lock', state.locked);
    if (state.page > 0) {
      params.set('p', String(state.page));
    }
  } else if (state.startTab !== DEFAULT_START_TAB) {
    params.set('tab', state.startTab);
  }
  if (state.temperature !== DEFAULT_TEMPERATURE) {
    params.set('t', state.temperature);
  }
  const search = params.toString().replaceAll('%2C', LIST_SEPARATOR);
  return search ? `?${search}` : '';
}

export function toSelection(state) {
  return {
    concepts: state.conceptId ? { [state.conceptId]: 1 } : {},
    required: lockedRequired(state.required, state.locked),
    excluded: state.excluded,
  };
}

export function hasLock(state) {
  return state.locked.length > 0;
}

export function withoutLock(state) {
  return hasLock(state) ? { ...state, locked: [] } : state;
}

export function removeFromMix(state, flavorId, mixFlavorIds) {
  const required = without(state.required, flavorId);
  const locked = without(mixFlavorIds, flavorId);
  return {
    ...state,
    required,
    excluded: state.excluded.includes(flavorId) ? state.excluded : [...state.excluded, flavorId],
    locked: lockedRequired(required, locked).length <= MAX_REQUIRED_FLAVORS ? locked : [],
    page: 0,
  };
}

export function isMixScreen(state) {
  return state.screen === MIX_SCREEN;
}

export function startMix(state, conceptId) {
  return { ...state, screen: MIX_SCREEN, source: null, conceptId, required: [], excluded: [], locked: [], page: 0 };
}

export function startFlavorMix(state, flavorId) {
  return {
    ...state,
    screen: MIX_SCREEN,
    source: FLAVOR_SOURCE,
    conceptId: null,
    required: [flavorId],
    excluded: [],
    locked: [],
    page: 0,
  };
}

export function setStartTab(state, startTab) {
  return state.startTab === startTab ? state : { ...state, startTab };
}

export function isFlavorSource(state) {
  return state.source === FLAVOR_SOURCE;
}

export function canPin(state) {
  return state.required.length < MAX_REQUIRED_FLAVORS;
}

export function pinFlavor(state, flavorId) {
  if (state.required.includes(flavorId) || !canPin(state)) {
    return state;
  }
  return refine(state, { required: [...state.required, flavorId], excluded: without(state.excluded, flavorId) });
}

export function unpinFlavor(state, flavorId) {
  return refine(state, { required: without(state.required, flavorId) });
}

export function includeFlavor(state, flavorId) {
  return refine(state, { excluded: without(state.excluded, flavorId), locked: [] });
}

export function nextPage(state) {
  return { ...state, locked: [], page: hasLock(state) ? 0 : state.page + 1 };
}

export function withPage(state, page) {
  return { ...state, page };
}

export function setTemperature(state, temperature) {
  return state.temperature === temperature ? state : { ...state, temperature, locked: [] };
}

function refine(state, changes) {
  return { ...state, ...changes, page: 0 };
}

function lockedRequired(required, locked) {
  return unique([...required, ...locked]);
}

function readList(params, key) {
  return (params.get(key) ?? '').split(LIST_SEPARATOR).filter(Boolean);
}

function writeList(params, key, values) {
  if (values.length > 0) {
    params.set(key, values.join(LIST_SEPARATOR));
  }
}

function unique(values) {
  return [...new Set(values)];
}

function without(values, value) {
  return values.filter((item) => item !== value);
}
