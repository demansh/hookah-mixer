import { readFileSync } from 'node:fs';
import { loadCatalog } from './catalog.mjs';
import { parseQuery } from './assets/js/engine/profile.js';

const catalog = loadCatalog();
const { shouldMatch, shouldNotMatch } = JSON.parse(readFileSync('./wordforms.json', 'utf8'));
const matchedIds = (query) => parseQuery(query, catalog).matched.filter((match) => !match.negated).map((match) => match.id);

const misses = Object.entries(shouldMatch)
  .filter(([query, expectedId]) => !matchedIds(query).includes(expectedId))
  .map(([query, expectedId]) => `"${query}" → [${matchedIds(query).join(', ') || '—'}], expected ${expectedId}`);
const falsePositives = shouldNotMatch
  .filter((query) => matchedIds(query).length > 0)
  .map((query) => `"${query}" → [${matchedIds(query).join(', ')}], expected nothing`);

console.log(`should match: ${Object.keys(shouldMatch).length - misses.length}/${Object.keys(shouldMatch).length}`);
misses.forEach((line) => console.log(`  MISS ${line}`));
console.log(`should not match: ${shouldNotMatch.length - falsePositives.length}/${shouldNotMatch.length}`);
falsePositives.forEach((line) => console.log(`  FALSE ${line}`));
process.exitCode = misses.length > 0 || falsePositives.length > 0 ? 1 : 0;
