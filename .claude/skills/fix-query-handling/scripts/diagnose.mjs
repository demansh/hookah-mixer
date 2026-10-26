import { loadCatalog, labelOf, formatMix } from './catalog.mjs';
import { parseQuery } from './assets/js/engine/profile.js';
import { getGraph } from './assets/js/engine/graph.js';
import { buildPool, generateCandidates } from './assets/js/engine/mixes.js';
import { recommend } from './assets/js/engine/recommend.js';
import { resolveMood } from './assets/js/ui/mood.js';

const pagesArgument = process.argv.find((argument) => argument.startsWith('--pages='));
const pageCount = pagesArgument ? Number(pagesArgument.split('=')[1]) : 1;
const seedArgument = process.argv.find((argument) => argument.startsWith('--seed='));
const seed = seedArgument ? Number(seedArgument.split('=')[1]) : undefined;
const queries = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const catalog = loadCatalog();
const graph = getGraph(catalog);
const formatWeights = (map) => [...map.entries()].sort((left, right) => right[1] - left[1]).map(([id, weight]) => `${id}:${weight}`).join(' ') || '—';

for (const query of queries) {
  const profile = parseQuery(query, catalog);
  console.log(`\n=== "${query}"`);
  console.log(`matched:       ${profile.matched.map((match) => `${match.negated ? '-' : ''}${match.type}:${match.id}${match.partial ? '~partial' : ''}`).join(' ') || '— (not understood → random mixes)'}`);
  console.log(`weights:       ${formatWeights(profile.weights)}`);
  console.log(`properties:    ${formatWeights(profile.properties)}`);
  console.log(`required:      ${profile.required.join(' ') || '—'}   excluded: ${[...profile.excluded].join(' ') || '—'}   avoid: ${[...profile.avoid].join(' ') || '—'}`);
  if (profile.contradictions.length > 0) {
    console.log(`contradictions: ${profile.contradictions.join(' ')}`);
  }
  if (!profile.isEmpty) {
    const pool = buildPool(profile, catalog, graph);
    const candidates = generateCandidates(pool, profile, catalog, graph);
    console.log(`pool:          ${pool.optionalIds.length} optional [${pool.optionalIds.map((id) => labelOf(catalog, id)).join(', ')}]`);
    console.log(`               core=${[...pool.coreIds].join(',') || '—'} cooling=${pool.coolingPolicy} candidates=${candidates.length}`);
  }
  for (let page = 0; page < pageCount; page += 1) {
    const result = await recommend({ query, seed }, catalog, page);
    const mood = resolveMood({ query, profile: result.profile, repeatCount: page });
    console.log(`page ${page}: mood=${mood}${result.profile.isRandom ? ' (random fallback)' : ''}`);
    result.mixes.forEach((mix) => {
      console.log(`  ${mix.tier.padEnd(8)} ${formatMix(catalog, mix)}${mix.note ? `   // ${mix.note.ru}` : ''}`);
    });
  }
}
