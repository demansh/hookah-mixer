import { buildTermIndex } from './flavors.js';

const CATALOG_FILES = {
  flavors: 'flavors.json',
  graph: 'graph.json',
  concepts: 'concepts.json',
};

export async function loadCatalog(baseUrl) {
  const entries = await Promise.all(
    Object.entries(CATALOG_FILES).map(async ([key, fileName]) => [
      key,
      await fetchJson(`${baseUrl}/assets/data/${fileName}`),
    ]),
  );
  const catalog = Object.fromEntries(entries);
  catalog.flavorsById = new Map(catalog.flavors.map((flavor) => [flavor.id, flavor]));
  catalog.termIndex = buildTermIndex(catalog.flavors);
  return catalog;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`);
  }
  return response.json();
}
