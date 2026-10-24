import { getLang } from '../i18n.js';
import { isIngredient } from '../flavors.js';

const BATCH_SIZE = 12;
const PRELOAD_DISTANCE_PX = 240;
const MAX_FILL_BATCHES = 5;
const MAX_CHIPS = 240;

export function initExampleChips({ container, concepts, flavors, onPick }) {
  const feed = createExampleFeed(concepts, flavors);
  let isAdjusting = false;

  const createBatch = () => {
    const fragment = document.createDocumentFragment();
    feed.next(BATCH_SIZE, getLang()).forEach((text) => fragment.append(createChip(text, onPick)));
    return fragment;
  };

  const shiftScroll = (delta) => {
    isAdjusting = true;
    container.scrollLeft += delta;
    isAdjusting = false;
  };

  const appendBatch = () => {
    container.append(createBatch());
    while (container.children.length > MAX_CHIPS) {
      const widthBefore = container.scrollWidth;
      container.firstElementChild.remove();
      shiftScroll(container.scrollWidth - widthBefore);
    }
  };

  const prependBatch = () => {
    const widthBefore = container.scrollWidth;
    container.prepend(createBatch());
    shiftScroll(container.scrollWidth - widthBefore);
    while (container.children.length > MAX_CHIPS) {
      container.lastElementChild.remove();
    }
  };

  const isNearEnd = () => container.scrollLeft + container.clientWidth >= container.scrollWidth - PRELOAD_DISTANCE_PX;
  const isNearStart = () => container.scrollLeft <= PRELOAD_DISTANCE_PX;

  const fillVisibleArea = () => {
    if (isAdjusting) {
      return;
    }
    for (let batch = 0; batch < MAX_FILL_BATCHES && isNearEnd(); batch += 1) {
      appendBatch();
    }
    for (let batch = 0; batch < MAX_FILL_BATCHES && isNearStart(); batch += 1) {
      prependBatch();
    }
  };

  const reset = () => {
    feed.reset();
    container.replaceChildren();
    container.scrollLeft = 0;
    appendBatch();
    prependBatch();
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

function createExampleFeed(concepts, flavors) {
  const sources = [
    createDeck(concepts.filter((concept) => concept.chip), (concept, lang) => concept.phrases[lang]?.[0] || concept.phrases.ru[0]),
    createDeck(flavors.filter(isIngredient), (flavor, lang) => flavor.label[lang] || flavor.label.ru),
  ].filter((source) => source.size > 0);
  let turn = 0;

  return {
    reset() {
      sources.forEach((source) => source.reset());
      turn = Math.floor(Math.random() * sources.length);
    },
    next(count, lang) {
      const texts = [];
      for (let index = 0; index < count && sources.length > 0; index += 1) {
        const source = sources[turn % sources.length];
        turn += 1;
        texts.push(capitalize(source.draw(lang)));
      }
      return texts;
    },
  };
}

function createDeck(items, toText) {
  let deck = [];
  let lastItemId = null;

  const refill = () => {
    deck = shuffle([...items]);
    if (deck.length > 1 && deck.at(-1).id === lastItemId) {
      [deck[0], deck[deck.length - 1]] = [deck[deck.length - 1], deck[0]];
    }
  };

  return {
    size: items.length,
    reset() {
      deck = [];
    },
    draw(lang) {
      if (deck.length === 0) {
        refill();
      }
      const item = deck.pop();
      lastItemId = item.id;
      return toText(item, lang);
    },
  };
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
