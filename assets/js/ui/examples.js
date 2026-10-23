import { getLang } from '../i18n.js';

const BATCH_SIZE = 12;
const PRELOAD_DISTANCE_PX = 240;
const MAX_FILL_BATCHES = 5;
const LEADING_PREPOSITIONS = new Set(['в', 'во', 'на', 'с', 'со', 'у', 'за', 'по', 'at', 'in', 'on', 'with', 'by']);

export function initExampleChips({ container, concepts, onPick }) {
  const feed = createExampleFeed(concepts);

  const appendBatch = () => {
    const fragment = document.createDocumentFragment();
    feed.next(BATCH_SIZE, getLang()).forEach((text) => fragment.append(createChip(text, onPick)));
    container.append(fragment);
  };

  const isNearEnd = () => container.scrollLeft + container.clientWidth >= container.scrollWidth - PRELOAD_DISTANCE_PX;

  const fillVisibleArea = () => {
    for (let batch = 0; batch < MAX_FILL_BATCHES && isNearEnd(); batch += 1) {
      appendBatch();
    }
  };

  const reset = () => {
    feed.reset();
    container.replaceChildren();
    container.scrollLeft = 0;
    appendBatch();
    fillVisibleArea();
  };

  container.addEventListener('scroll', fillVisibleArea, { passive: true });
  reset();
  return { reset };
}

function createChip(text, onPick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = text;
  chip.addEventListener('click', () => onPick(text));
  return chip;
}

function createExampleFeed(concepts) {
  let deck = [];
  let lastConceptId = null;

  const refill = () => {
    deck = shuffle([...concepts]);
    if (deck.length > 1 && deck.at(-1).id === lastConceptId) {
      [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
  };

  return {
    reset() {
      deck = [];
    },
    next(count, lang) {
      const texts = [];
      for (let index = 0; index < count && concepts.length > 0; index += 1) {
        if (deck.length === 0) {
          refill();
        }
        const concept = deck.pop();
        lastConceptId = concept.id;
        texts.push(capitalize(pickRandom(displayablePhrases(concept, lang))));
      }
      return texts;
    },
  };
}

function displayablePhrases(concept, lang) {
  const phrases = concept.phrases[lang]?.length ? concept.phrases[lang] : concept.phrases.ru;
  const withoutLeadingPreposition = phrases.filter((phrase) => !LEADING_PREPOSITIONS.has(phrase.split(/\s+/)[0].toLowerCase()));
  return withoutLeadingPreposition.length > 0 ? withoutLeadingPreposition : phrases;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
