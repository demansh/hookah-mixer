import { normalizeTerm } from '../flavors.js';

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const SHORT_TOKEN_LENGTH = 3;
const SHORT_TOKEN_MAX_SUFFIX = 3;
const LONG_TOKEN_MAX_SUFFIX = 5;
const LONG_TOKEN_PREFIX_SLACK = 2;
const EXACT_MATCH_SCORE = 1.1;
const TIE_BREAK_WEIGHT = 0.01;

export function tokenize(text) {
  return normalizeTerm(text).match(TOKEN_PATTERN) ?? [];
}

export function tokenMatchScore(queryToken, entryToken) {
  if (queryToken === entryToken) {
    return EXACT_MATCH_SCORE;
  }
  if (entryToken.length <= SHORT_TOKEN_LENGTH) {
    const isShortMatch = queryToken.startsWith(entryToken)
      && queryToken.length <= entryToken.length + SHORT_TOKEN_MAX_SUFFIX;
    return isShortMatch ? 1 : 0;
  }
  const prefixLength = commonPrefixLength(queryToken, entryToken);
  const requiredPrefix = Math.max(SHORT_TOKEN_LENGTH, entryToken.length - LONG_TOKEN_PREFIX_SLACK);
  if (prefixLength < requiredPrefix || queryToken.length > entryToken.length + LONG_TOKEN_MAX_SUFFIX) {
    return 0;
  }
  return prefixLength / Math.max(entryToken.length, queryToken.length) + TIE_BREAK_WEIGHT * (prefixLength / entryToken.length);
}

function commonPrefixLength(left, right) {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) {
    index += 1;
  }
  return index;
}
