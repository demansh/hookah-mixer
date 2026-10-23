import { tokenize, tokenMatchScore } from './text.js';

const NEGATION_TOKENS = new Set(['без', 'кроме', 'no', 'without', 'except']);
const CONJUNCTION_TOKENS = new Set(['и', 'или', 'а', 'and', 'or']);
const MAX_REQUIRED_FLAVORS = 3;
const matcherCache = new WeakMap();

export function parseQuery(query, catalog, excludedIds = []) {
  const tokens = tokenize(query);
  const matcher = getMatcher(catalog);
  const matches = [];
  let isNegationActive = false;
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (NEGATION_TOKENS.has(token)) {
      isNegationActive = true;
      index += 1;
      continue;
    }
    const match = findBestMatch(tokens, index, matcher);
    if (match) {
      matches.push({ ...match.target, negated: isNegationActive });
      index += match.length;
      continue;
    }
    if (!CONJUNCTION_TOKENS.has(token)) {
      isNegationActive = false;
    }
    index += 1;
  }
  return buildProfile(matches, catalog, excludedIds);
}

function getMatcher(catalog) {
  if (!matcherCache.has(catalog)) {
    matcherCache.set(catalog, buildMatcher(catalog));
  }
  return matcherCache.get(catalog);
}

function buildMatcher(catalog) {
  const entriesByLength = new Map();
  const addEntry = (phrase, target) => {
    const tokens = tokenize(phrase);
    if (tokens.length === 0) {
      return;
    }
    if (!entriesByLength.has(tokens.length)) {
      entriesByLength.set(tokens.length, []);
    }
    entriesByLength.get(tokens.length).push({ tokens, target });
  };
  catalog.concepts.forEach((concept) => {
    [...concept.phrases.ru, ...concept.phrases.en].forEach((phrase) => {
      addEntry(phrase, { type: 'concept', id: concept.id });
    });
  });
  catalog.flavors.forEach((flavor) => {
    const type = flavor.kind === 'property' ? 'property' : 'flavor';
    [flavor.label.ru, flavor.label.en, ...flavor.synonyms.ru, ...flavor.synonyms.en].forEach((term) => {
      addEntry(term, { type, id: flavor.id });
    });
  });
  const maxTokens = Math.max(0, ...entriesByLength.keys());
  return { entriesByLength, maxTokens };
}

function findBestMatch(tokens, startIndex, matcher) {
  const longestPossible = Math.min(matcher.maxTokens, tokens.length - startIndex);
  for (let length = longestPossible; length >= 1; length -= 1) {
    let best = null;
    for (const entry of matcher.entriesByLength.get(length) ?? []) {
      const score = scoreEntry(tokens, startIndex, entry.tokens);
      if (score > 0 && (!best || score > best.score)) {
        best = { score, length, target: entry.target };
      }
    }
    if (best) {
      return best;
    }
  }
  return null;
}

function scoreEntry(tokens, startIndex, entryTokens) {
  let total = 0;
  for (let offset = 0; offset < entryTokens.length; offset += 1) {
    const score = tokenMatchScore(tokens[startIndex + offset], entryTokens[offset]);
    if (score === 0) {
      return 0;
    }
    total += score;
  }
  return total;
}

function buildProfile(matches, catalog, excludedIds) {
  const conceptsById = new Map(catalog.concepts.map((concept) => [concept.id, concept]));
  const weights = new Map();
  const properties = new Map();
  const required = [];
  const excluded = new Set(excludedIds);
  const avoid = new Set();
  const matched = [];
  const seenMatches = new Set();

  const raiseWeight = (map, id, weight) => {
    map.set(id, Math.max(map.get(id) ?? 0, weight));
  };
  const isProperty = (id) => catalog.flavorsById.get(id)?.kind === 'property';

  matches.forEach(({ type, id, negated }) => {
    const matchKey = `${type}:${id}:${negated}`;
    if (!seenMatches.has(matchKey)) {
      seenMatches.add(matchKey);
      matched.push({ type, id, negated });
    }
    if (negated) {
      if (type === 'flavor') {
        excluded.add(id);
      }
      return;
    }
    if (type === 'concept') {
      const concept = conceptsById.get(id);
      Object.entries(concept.tags).forEach(([tagId, weight]) => {
        raiseWeight(isProperty(tagId) ? properties : weights, tagId, weight);
      });
      concept.avoid.forEach((tagId) => avoid.add(tagId));
    } else if (type === 'property') {
      raiseWeight(properties, id, 1);
    } else {
      raiseWeight(weights, id, 1);
      if (!required.includes(id)) {
        required.push(id);
      }
    }
  });

  excluded.forEach((id) => weights.delete(id));
  const allowedRequired = required.filter((id) => !excluded.has(id)).slice(0, MAX_REQUIRED_FLAVORS);
  allowedRequired.forEach((id) => avoid.delete(id));

  return {
    weights,
    properties,
    required: allowedRequired,
    excluded,
    avoid,
    matched,
    isEmpty: weights.size === 0 && properties.size === 0,
  };
}
