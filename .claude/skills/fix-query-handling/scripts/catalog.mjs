import { readFileSync } from 'node:fs';
import { buildTermIndex } from './assets/js/flavors.js';

export function loadCatalog() {
  const load = (name) => JSON.parse(readFileSync(`./assets/data/${name}.json`, 'utf8'));
  const catalog = { flavors: load('flavors'), graph: load('graph'), concepts: load('concepts') };
  catalog.flavorsById = new Map(catalog.flavors.map((flavor) => [flavor.id, flavor]));
  catalog.termIndex = buildTermIndex(catalog.flavors);
  return catalog;
}

export function labelOf(catalog, id) {
  return catalog.flavorsById.get(id)?.label.ru ?? id;
}

export function formatMix(catalog, mix) {
  return mix.components.map((component) => `${labelOf(catalog, component.flavorId)} ${component.share}%`).join(' · ');
}

export function allKnownQueries(catalog) {
  return [
    ...catalog.flavors.filter((flavor) => flavor.kind === 'flavor').flatMap((flavor) => [flavor.label.ru, flavor.label.en]),
    ...catalog.flavors.filter((flavor) => flavor.kind === 'property').flatMap((flavor) => [flavor.label.ru, flavor.label.en, ...flavor.synonyms.ru]),
    ...catalog.concepts.flatMap((concept) => [...concept.phrases.ru, ...concept.phrases.en]),
  ];
}
