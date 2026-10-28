const STORAGE_KEY = 'hm.saved-mixes';
const SCHEMA_VERSION = 1;
const SOURCE_TYPES = new Set(['concept', 'flavor', 'shelf', 'random', 'shared']);
const TIERS = new Set(['classic', 'balanced', 'bold']);

export function mixKey(mix) {
  return mix.components
    .map(({ flavorId, share }) => `${flavorId}:${share}`)
    .sort()
    .join('|');
}

export function loadFavorites(catalog) {
  const stored = readStored();
  const items = stored?.version === SCHEMA_VERSION && Array.isArray(stored.items) ? stored.items : [];
  return items.filter((item) => isValidItem(item, catalog));
}

export function addFavorite(favorites, mix, source) {
  const key = mixKey(mix);
  if (favorites.some((item) => item.key === key)) {
    return favorites;
  }
  const item = {
    key,
    tier: mix.tier,
    components: mix.components.map(({ flavorId, share }) => ({ flavorId, share })),
    source,
    addedAt: Date.now(),
  };
  return persist([item, ...favorites]);
}

export function removeFavorite(favorites, key) {
  return persist(favorites.filter((item) => item.key !== key));
}

export function restoreFavorite(favorites, item) {
  if (favorites.some((existing) => existing.key === item.key)) {
    return favorites;
  }
  return persist([...favorites, item].sort((left, right) => right.addedAt - left.addedAt));
}

export function isFavorite(favorites, mix) {
  const key = mixKey(mix);
  return favorites.some((item) => item.key === key);
}

function persist(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, items }));
  } catch (error) {
    console.warn('Favorites were not saved', error);
  }
  return items;
}

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function isValidItem(item, catalog) {
  return Boolean(item)
    && typeof item.key === 'string'
    && typeof item.addedAt === 'number'
    && TIERS.has(item.tier)
    && SOURCE_TYPES.has(item.source?.type)
    && Array.isArray(item.components)
    && item.components.length > 0
    && item.components.every(({ flavorId, share }) => catalog.flavorsById.has(flavorId) && Number.isFinite(share));
}
