const STORAGE_KEY = 'hm.favorites';
const SCHEMA_VERSION = 1;

const listeners = new Set();
let items = readItems();

export function mixKey(components) {
  return [...components]
    .map((component) => `${component.flavorId}:${component.share}`)
    .sort()
    .join('|');
}

export function listFavorites() {
  return [...items].sort((left, right) => right.addedAt - left.addedAt);
}

export function favoritesCount() {
  return items.length;
}

export function isFavorite(components) {
  const key = mixKey(components);
  return items.some((item) => item.key === key);
}

export function addFavorite(mix, query) {
  const key = mixKey(mix.components);
  if (items.some((item) => item.key === key)) {
    return;
  }
  items = [...items, {
    key,
    tier: mix.tier,
    components: mix.components.map(({ flavorId, share }) => ({ flavorId, share })),
    query: query || '',
    addedAt: Date.now(),
  }];
  persist();
  requestPersistentStorage();
}

export function removeFavorite(components) {
  const key = mixKey(components);
  const removed = items.find((item) => item.key === key) ?? null;
  if (removed) {
    items = items.filter((item) => item.key !== key);
    persist();
  }
  return removed;
}

export function restoreFavorite(item) {
  if (items.some((existing) => existing.key === item.key)) {
    return;
  }
  items = [...items, item];
  persist();
}

export function toggleFavorite(mix, query) {
  if (isFavorite(mix.components)) {
    removeFavorite(mix.components);
    return false;
  }
  addFavorite(mix, query);
  return true;
}

export function onFavoritesChange(listener) {
  listeners.add(listener);
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, items }));
  } catch {
    return;
  } finally {
    listeners.forEach((listener) => listener());
  }
}

function readItems() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!stored || stored.version !== SCHEMA_VERSION || !Array.isArray(stored.items)) {
      return [];
    }
    return stored.items.filter(isValidItem);
  } catch {
    return [];
  }
}

function isValidItem(item) {
  return item && typeof item.key === 'string' && Array.isArray(item.components) && typeof item.addedAt === 'number';
}

function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => false);
}
