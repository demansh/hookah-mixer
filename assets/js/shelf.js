import { isIngredient } from '../core/js/index.js';

const STORAGE_KEY = 'hm.shelf';
const SCHEMA_VERSION = 1;

export function loadShelf(catalog) {
  const stored = readStored();
  const items = stored?.version === SCHEMA_VERSION && Array.isArray(stored.items) ? stored.items : [];
  return new Set(items.filter((id) => isIngredient(catalog.flavorsById.get(id) ?? {})));
}

export function saveShelf(shelf) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, items: [...shelf].sort() }));
  } catch (error) {
    console.warn('Shelf was not saved', error);
  }
}

export function shelfExclusions(shelf, catalog) {
  return catalog.flavors.filter((flavor) => isIngredient(flavor) && !shelf.has(flavor.id)).map((flavor) => flavor.id);
}

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}
