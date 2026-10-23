import { parseQuery } from './profile.js';
import { getGraph } from './graph.js';
import { buildPool, generateCandidates } from './mixes.js';
import { allocateShares } from './shares.js';

export const MIXES_PER_PAGE = 3;

const TIERS = [
  {
    id: 'classic',
    accepts: (candidate) => candidate.novelty <= 0.5 && candidate.discoveryCount <= 1,
    score: (candidate) => candidate.baseScore + 0.15 * candidate.familiarity - 0.25 * candidate.novelty
      + (candidate.rarePairCount > 0 ? 0.05 : 0) - 0.1 * candidate.discoveryCount,
  },
  {
    id: 'balanced',
    accepts: (candidate) => candidate.novelty >= 0.25 && candidate.novelty <= 0.75,
    score: (candidate) => candidate.baseScore + 0.1 * candidate.novelty,
  },
  {
    id: 'bold',
    accepts: (candidate) => candidate.novelty >= 0.5 && candidate.minAffinity >= 0.2,
    score: (candidate) => 0.8 * candidate.baseScore + 0.35 * candidate.novelty,
  },
];
const MAX_PAGE_SIMILARITY = 0.5;
const RANKING_CACHE_SIZE = 5;
const COOLING_ID = 'cooling';
const rankingCache = new Map();

export async function recommend(request, catalog, page = 0) {
  const profile = parseQuery(request.query, catalog, request.excludedIds);
  if (profile.isEmpty) {
    return { profile, mixes: [] };
  }
  const rankings = getRankings(request, profile, catalog);
  const mixes = selectPage(rankings, page).map(({ tierId, candidate }) => toMix(tierId, candidate, rankings.pool, catalog));
  return { profile, mixes };
}

function getRankings(request, profile, catalog) {
  const cacheKey = JSON.stringify([request.query.toLowerCase(), [...profile.excluded].sort()]);
  if (rankingCache.has(cacheKey)) {
    return rankingCache.get(cacheKey);
  }
  const graph = getGraph(catalog);
  const pool = buildPool(profile, catalog, graph);
  const candidates = generateCandidates(pool, profile, catalog, graph);
  const byTier = new Map(TIERS.map((tier) => {
    const accepted = candidates.filter(tier.accepts);
    const source = accepted.length > 0 ? accepted : candidates;
    return [tier.id, [...source].sort((left, right) => tier.score(right) - tier.score(left))];
  }));
  const rankings = { pool, byTier, graph };
  rankingCache.set(cacheKey, rankings);
  if (rankingCache.size > RANKING_CACHE_SIZE) {
    rankingCache.delete(rankingCache.keys().next().value);
  }
  return rankings;
}

function selectPage(rankings, page) {
  const usedKeys = new Set();
  let selection = [];
  for (let pageIndex = 0; pageIndex <= page; pageIndex += 1) {
    selection = [];
    TIERS.forEach((tier) => {
      const ranked = rankings.byTier.get(tier.id);
      const pick = findPick(ranked, usedKeys, selection, true) ?? findPick(ranked, usedKeys, selection, false);
      if (pick) {
        usedKeys.add(candidateKey(pick));
        selection.push({ tierId: tier.id, candidate: pick });
      }
    });
  }
  return selection;
}

function findPick(ranked, usedKeys, selection, requireDiversity) {
  return ranked.find((candidate) => {
    if (usedKeys.has(candidateKey(candidate))) {
      return false;
    }
    if (!requireDiversity) {
      return true;
    }
    return selection.every(({ candidate: picked }) => similarity(candidate, picked) <= MAX_PAGE_SIMILARITY);
  });
}

function candidateKey(candidate) {
  return [...candidate.ids].sort().join('+');
}

function similarity(left, right) {
  const leftIds = new Set(left.ids.filter((id) => id !== COOLING_ID));
  const rightIds = right.ids.filter((id) => id !== COOLING_ID);
  const shared = rightIds.filter((id) => leftIds.has(id)).length;
  return shared / (leftIds.size + rightIds.length - shared);
}

function toMix(tierId, candidate, pool, catalog) {
  const maxScore = Math.max(...pool.scores.values(), 1);
  const relevanceById = new Map(candidate.ids.map((id) => [id, (pool.scores.get(id) ?? 0) / maxScore]));
  const shares = allocateShares(candidate.flavors, relevanceById, new Set(pool.requiredIds));
  const components = candidate.ids
    .map((flavorId, index) => ({ flavorId, share: shares[index] }))
    .sort((left, right) => right.share - left.share);
  return { tier: tierId, components, note: pickNote(tierId, candidate) };
}

function pickNote(tierId, candidate) {
  const notedPairs = candidate.pairs.filter((pair) => pair.note);
  if (notedPairs.length === 0) {
    return null;
  }
  const preferRare = tierId !== 'classic';
  const ranked = [...notedPairs].sort((left, right) => {
    if (preferRare) {
      const rarity = Number(right.familiarity === 'rare') - Number(left.familiarity === 'rare');
      if (rarity !== 0) {
        return rarity;
      }
    }
    return right.affinity - left.affinity;
  });
  return ranked[0].note;
}
