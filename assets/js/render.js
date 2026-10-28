import { flavorLabel, isIngredient, noteForMix } from '../core/js/index.js';
import { TEMPERATURES, START_TABS, FLAVOR_CATEGORIES, HIDDEN_TASTE_FLAVORS, MIN_SHELF_SIZE } from './options.js';
import { t, getLang } from './i18n.js';
import { createIcon } from './icons.js';
import { CONCEPT_EMOJI } from './concept-emoji.js';
import { addPressHandlers } from './long-press.js';
import { flavorColor } from './flavor-colors.js';

const TASTE_TRAITS = [
  { trait: 'sweet', labelKey: 'tasteSweet' },
  { trait: 'sour', labelKey: 'tasteSour' },
  { trait: 'fresh', labelKey: 'tasteFresh' },
];
const TASTE_SCALE = 5;
const REVEAL_STEP_MS = 70;
const COUNT_UP_MS = 450;
const COUNT_UP_SAFETY_MS = 100;
const MORPH_MS = 400;

export function conceptLabel(concept) {
  const phrase = concept.phrases[getLang()][0] ?? concept.phrases.ru[0] ?? concept.id;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function renderStart(container, view, actions) {
  const { startTab, shelf, favorites } = view;
  const tabs = createElement('div', 'start-tabs');
  tabs.setAttribute('role', 'group');
  START_TABS.forEach((tab) => {
    const selectTab = () => actions.onSetStartTab(tab.id);
    const button = createButton(`start-tab start-tab--${tab.id}`, selectTab, tabLabel(tab, view));
    button.setAttribute('aria-pressed', String(tab.id === startTab));
    if (tab.id === 'favorites') {
      button.setAttribute('aria-label', `${t(tab.labelKey)}: ${favorites.length}`);
      button.title = t(tab.labelKey);
    }
    tabs.append(button);
  });
  container.replaceChildren(tabs, ...createStartContent(view, actions));
}

function tabLabel(tab, { shelf, favorites }) {
  if (tab.id === 'favorites') {
    return favorites.length > 0 ? `★ ${favorites.length}` : '☆';
  }
  if (tab.id === 'shelf' && shelf.size > 0) {
    return `${t(tab.labelKey)} · ${shelf.size}`;
  }
  return t(tab.labelKey);
}

function createStartContent({ concepts, catalog, startTab, shelf, shelfLetter, favorites }, actions) {
  if (startTab === 'taste') {
    return [
      createElement('p', 'screen-hint', t('tasteHint')),
      ...createFlavorGroups(catalog, {
        hiddenIds: HIDDEN_TASTE_FLAVORS,
        createChip: (id, name) => createButton('flavor-chip', () => actions.onPickFlavor(id), name),
      }),
    ];
  }
  if (startTab === 'favorites') {
    return createFavoritesList(catalog, favorites, actions);
  }
  if (startTab === 'shelf') {
    const editor = createShelfEditor(catalog, shelf, shelfLetter, actions);
    return [createElement('p', 'screen-hint', t('shelfHint')), ...editor];
  }
  return [createElement('p', 'screen-hint', t('startHint')), createConceptGrid(concepts, actions)];
}

function createConceptGrid(concepts, actions) {
  const grid = createElement('div', 'concept-grid');
  concepts.forEach((concept) => grid.append(createConceptButton(concept, actions)));
  return grid;
}

function shelfLetterOf(name) {
  return name.charAt(0).toLocaleUpperCase(getLang()).replace('Ё', 'Е');
}

function favoriteTitle(source, catalog) {
  if (source.type === 'concept') {
    const concept = catalog.concepts.find((item) => item.id === source.conceptId);
    return concept ? conceptLabel(concept) : null;
  }
  if (source.type === 'shared') {
    return source.query ? source.query.charAt(0).toUpperCase() + source.query.slice(1) : t('sharedMix');
  }
  const sourceKeys = { flavor: 'byFlavor', shelf: 'fromShelf', random: 'randomMixTitle' };
  return t(sourceKeys[source.type]);
}

function createFavoritesList(catalog, favorites, { onRemoveFavorite, onShareMix }) {
  if (favorites.length === 0) {
    return [createElement('p', 'screen-hint', t('favoritesEmpty'))];
  }
  return favorites.map((item) => createReadonlyCard(catalog, item, favoriteTitle(item.source, catalog), [
    createIconButton('share-button', () => onShareMix(item), 'share', t('shareMix')),
    createIconButton('saved-remove-button', () => onRemoveFavorite(item.key), 'x', t('removeFavorite')),
  ]));
}

export function renderShared(container, { catalog, mix, title, isSaved }, { onShareMix, onToggleFavorite }) {
  const starLabel = t(isSaved ? 'removeFavorite' : 'saveFavorite');
  const starButton = createIconButton('star-button', onToggleFavorite, 'star', starLabel);
  starButton.setAttribute('aria-pressed', String(isSaved));
  container.replaceChildren(createReadonlyCard(catalog, mix, title, [
    createIconButton('share-button', () => onShareMix(mix), 'share', t('shareMix')),
    starButton,
  ]));
}

function createReadonlyCard(catalog, mix, title, headerButtons) {
  const card = createElement('article', `mix-card mix-card--${mix.tier} saved-card`);
  const header = createElement('div', 'mix-header');
  const buttons = createElement('div', 'mix-header-actions');
  buttons.append(...headerButtons);
  header.append(title ? createElement('h2', 'mix-concept', title) : createElement('span', 'mix-concept'), buttons);
  const rows = createElement('ul', 'mix-components');
  mix.components.forEach(({ flavorId, share }) => {
    const row = createElement('li', 'mix-component');
    row.append(
      createFlavorName(catalog, flavorId),
      createElement('span', 'mix-component-share', `${share}%`),
    );
    rows.append(row);
  });
  card.append(header, createMixBar(mix), rows, createTasteProfile(mix, catalog));
  const noteText = noteForMix(mix, catalog)?.[getLang()];
  if (noteText) {
    card.append(createElement('p', 'mix-note', noteText));
  }
  return card;
}

function createShelfEditor(catalog, shelf, shelfLetter, { onToggleShelf, onPickShelfLetter }) {
  const flavors = catalog.flavors
    .filter(isIngredient)
    .map((flavor) => ({ id: flavor.id, name: flavorLabel(flavor, getLang()) }))
    .sort((left, right) => left.name.localeCompare(right.name, getLang()))
    .map((flavor) => ({ ...flavor, letter: shelfLetterOf(flavor.name) }));
  const letters = [...new Set(flavors.map((flavor) => flavor.letter))];
  const currentLetter = letters.includes(shelfLetter) ? shelfLetter : letters[0];
  const shelfFlavors = flavors.filter((flavor) => shelf.has(flavor.id));

  const selected = createElement('section', 'shelf-selected');
  if (shelfFlavors.length === 0) {
    selected.append(createElement('p', 'shelf-empty', t('shelfEmpty')));
  } else {
    const selectedChips = createElement('div', 'flavor-chips');
    shelfFlavors.forEach(({ id, name }) => {
      const chip = createButton('flavor-chip shelf-item', () => onToggleShelf(id), `${name} ✕`);
      chip.setAttribute('aria-label', t('shelfRemove', { flavor: name }));
      selectedChips.append(chip);
    });
    const title = createElement('h2', 'shelf-selected-title', t('shelfSelected', { count: shelfFlavors.length }));
    selected.append(title, selectedChips);
  }

  const letterBar = createElement('div', 'shelf-letters');
  letterBar.setAttribute('role', 'group');
  letterBar.setAttribute('aria-label', t('shelfLetters'));
  const shelfLetters = new Set(shelfFlavors.map((flavor) => flavor.letter));
  letters.forEach((letter) => {
    const className = `shelf-letter${shelfLetters.has(letter) ? ' shelf-letter--has-items' : ''}`;
    const button = createButton(className, () => onPickShelfLetter(letter), letter);
    button.setAttribute('aria-pressed', String(letter === currentLetter));
    letterBar.append(button);
  });

  const chips = createElement('div', 'flavor-chips');
  flavors
    .filter((flavor) => flavor.letter === currentLetter)
    .forEach(({ id, name }) => {
      const chip = createButton('flavor-chip shelf-chip', () => onToggleShelf(id), name);
      chip.setAttribute('aria-pressed', String(shelf.has(id)));
      chips.append(chip);
    });
  return [selected, letterBar, chips];
}

function createFlavorGroups(catalog, { hiddenIds, createChip }) {
  const knownCategories = new Set(FLAVOR_CATEGORIES.map((category) => category.id));
  const tasteFlavors = catalog.flavors.filter((flavor) => isIngredient(flavor) && !hiddenIds.has(flavor.id));
  const groups = [
    ...FLAVOR_CATEGORIES.map((category) => ({
      title: `${category.emoji} ${t(category.labelKey)}`,
      flavors: tasteFlavors.filter((flavor) => flavor.category === category.id),
    })),
    { title: t('categoryOther'), flavors: tasteFlavors.filter((flavor) => !knownCategories.has(flavor.category)) },
  ];
  return groups
    .filter((group) => group.flavors.length > 0)
    .map((group) => {
      const section = createElement('section', 'flavor-group');
      const chips = createElement('div', 'flavor-chips');
      group.flavors
        .map((flavor) => ({ id: flavor.id, name: flavorLabel(flavor, getLang()) }))
        .sort((left, right) => left.name.localeCompare(right.name, getLang()))
        .forEach(({ id, name }) => chips.append(createChip(id, name)));
      section.append(createElement('h2', 'flavor-group-title', group.title), chips);
      return section;
    });
}

function createConceptButton(concept, { onPickConcept, onPeekConcept, onPeekEnd }) {
  const emoji = CONCEPT_EMOJI[concept.id];
  const name = conceptLabel(concept);
  if (!emoji) {
    return createButton('concept-chip', () => onPickConcept(concept.id), name);
  }
  const button = createElement('button', 'concept-emoji', emoji);
  button.type = 'button';
  button.setAttribute('aria-label', name);
  button.title = name;
  addPressHandlers(button, {
    onTap: () => onPickConcept(concept.id),
    onLongPress: () => onPeekConcept(`${emoji} ${name}`),
    onLongPressEnd: onPeekEnd,
  });
  return button;
}

export function renderMix(container, view, actions) {
  const { mix, isFallbackTier, title, nothingFoundKey, isSaved, animate, edit, catalog } = view;
  const shouldAnimate = animate && !prefersReducedMotion();
  const morph = mix && edit && !prefersReducedMotion() ? edit : null;
  const motionClass = shouldAnimate ? ' mix-card--reveal' : morph ? ' mix-card--morph' : '';
  const card = createElement('article', `mix-card mix-card--${mix?.tier ?? 'none'}${motionClass}`);
  const header = createElement('div', 'mix-header');
  header.append(title ? createElement('h2', 'mix-concept', title) : createElement('span', 'mix-concept'));
  if (mix) {
    const starLabel = t(isSaved ? 'removeFavorite' : 'saveFavorite');
    const starButton = createIconButton('star-button', actions.onToggleFavorite, 'star', starLabel);
    starButton.setAttribute('aria-pressed', String(isSaved));
    const buttons = createElement('div', 'mix-header-actions');
    buttons.append(createIconButton('share-button', () => actions.onShareMix(mix), 'share', t('shareMix')), starButton);
    header.append(buttons);
  }
  card.append(header);
  if (isFallbackTier) {
    card.append(createElement('p', 'mix-hint', t('fallbackTier')));
  }
  let morphParts = null;
  if (mix) {
    const previousShares = new Map((morph?.previousMix.components ?? []).map((item) => [item.flavorId, item.share]));
    const componentList = createElement('ul', 'mix-components');
    mix.components.forEach((component, index) => {
      const row = createComponentRow(component, view, actions);
      row.style.setProperty('--reveal-index', String(index));
      if (morph && !previousShares.has(component.flavorId)) {
        row.classList.add('mix-component--arrived');
      }
      componentList.append(row);
    });
    const bar = morph ? createMorphBar(mix, morph) : createMixBar(mix);
    const leavingRow = morph ? insertLeavingRow(componentList, catalog, morph) : null;
    card.append(bar, componentList, createTasteProfile(mix, catalog));
    if (shouldAnimate) {
      countUpShares(componentList);
    }
    if (morph) {
      morphParts = { bar, leavingRow };
      componentList.querySelectorAll('.mix-component:not(.mix-component--leaving)').forEach((row, index) => {
        const { flavorId, share } = mix.components[index];
        tweenShare(row.querySelector('.mix-component-share'), previousShares.get(flavorId) ?? 0, share, 0, MORPH_MS);
      });
    }
    const noteText = mix.note?.[getLang()];
    if (noteText) {
      card.append(createElement('p', 'mix-note', noteText));
    }
  } else {
    card.append(createElement('p', 'mix-hint', t(nothingFoundKey)));
  }
  container.replaceChildren(card, ...optional(createExcludedRow(view, actions)));
  if (morphParts) {
    startMorph(morphParts);
  }
}

export function renderBottomActions(container, { isMixScreen, isSharedScreen, startTab, shelfSize }, actions) {
  const { onSurprise, onShelfMix, onReset, onAnother } = actions;
  if (isSharedScreen) {
    container.replaceChildren(createButton('surprise-button', onReset, `🏠 ${t('goHome')}`));
    return;
  }
  if (!isMixScreen && startTab === 'shelf') {
    const isShelfReady = shelfSize >= MIN_SHELF_SIZE;
    const label = isShelfReady ? t('shelfMix') : t('shelfNeedMore', { count: MIN_SHELF_SIZE });
    const button = createButton('surprise-button', onShelfMix, label);
    button.disabled = !isShelfReady;
    container.replaceChildren(button);
    return;
  }
  if (!isMixScreen) {
    container.replaceChildren(createButton('surprise-button', onSurprise, t('randomMix')));
    return;
  }
  const tabName = t(START_TABS.find((tab) => tab.id === startTab)?.labelKey ?? 'tabMood');
  const backButton = createLabeledIconButton('back-button', onReset, 'arrow-left', tabName);
  backButton.setAttribute('aria-label', t('backTo', { tab: tabName }));
  const anotherButton = createLabeledIconButton('another-button', onAnother, 'refresh', t('anotherMix'));
  container.replaceChildren(backButton, anotherButton);
}

export function renderThermometer(container, currentTier, { onSetTemperature }) {
  const scale = createElement('div', `thermometer-scale thermometer-scale--${currentTier}`);
  scale.setAttribute('role', 'group');
  scale.setAttribute('aria-label', t('thermometer'));
  TEMPERATURES.forEach((temperature) => {
    const selectTemperature = () => onSetTemperature(temperature.tier);
    const button = createButton(`thermometer-step thermometer-step--${temperature.tier}`, selectTemperature);
    button.setAttribute('aria-pressed', String(temperature.tier === currentTier));
    button.append(createElement('span', 'thermometer-value', t(temperature.labelKey)));
    scale.append(button);
  });
  const tube = createElement('div', 'thermometer-tube');
  tube.setAttribute('aria-hidden', 'true');
  tube.append(
    createElement('div', 'thermometer-empty'),
    ...TEMPERATURES.map(({ tier }) => createElement('div', `thermometer-tick thermometer-tick--${tier}`)),
    createElement('div', 'thermometer-knob'),
  );
  scale.append(tube);
  container.replaceChildren(scale);
}

function createFlavorName(catalog, flavorId) {
  const name = createElement('span', 'mix-component-name');
  const dot = createElement('span', 'flavor-dot');
  dot.style.setProperty('--flavor-color', flavorColor(flavorId));
  dot.setAttribute('aria-hidden', 'true');
  name.append(dot, document.createTextNode(label(catalog, flavorId)));
  return name;
}

function createMixBar(mix) {
  const bar = createElement('div', 'mix-bar');
  bar.setAttribute('aria-hidden', 'true');
  mix.components.forEach(({ flavorId, share }, index) => {
    const segment = createElement('span', 'mix-bar-segment');
    segment.style.setProperty('--flavor-color', flavorColor(flavorId));
    segment.style.setProperty('flex-grow', String(share));
    segment.style.setProperty('--reveal-index', String(index));
    bar.append(segment);
  });
  return bar;
}

function createTasteProfile(mix, catalog) {
  const profile = createElement('div', 'taste-profile');
  const parts = TASTE_TRAITS.map(({ trait, labelKey }) => {
    const level = Math.round(weightedTrait(mix, catalog, trait));
    const item = createElement('div', 'taste-trait');
    const dots = createElement('span', 'taste-dots');
    for (let index = 0; index < TASTE_SCALE; index += 1) {
      dots.append(createElement('span', `taste-dot${index < level ? ' taste-dot--on' : ''}`));
    }
    item.append(createElement('span', 'taste-label', t(labelKey)), dots);
    profile.append(item);
    return `${t(labelKey)} ${level}/${TASTE_SCALE}`;
  });
  profile.setAttribute('role', 'img');
  profile.setAttribute('aria-label', parts.join(', '));
  return profile;
}

function weightedTrait(mix, catalog, trait) {
  const total = mix.components.reduce((sum, { share }) => sum + share, 0) || 1;
  return mix.components.reduce((sum, { flavorId, share }) => {
    const value = catalog.flavorsById.get(flavorId)?.[trait] ?? 0;
    return sum + value * share;
  }, 0) / total;
}

function countUpShares(componentList) {
  componentList.querySelectorAll('.mix-component-share').forEach((element, index) => {
    tweenShare(element, 0, Number.parseInt(element.textContent, 10), index * REVEAL_STEP_MS, COUNT_UP_MS);
  });
}

function tweenShare(element, from, to, delay, duration) {
  const finalText = `${to}%`;
  if (from === to) {
    element.textContent = finalText;
    return;
  }
  const startAt = performance.now() + delay;
  let isDone = false;
  const finish = () => {
    isDone = true;
    element.textContent = finalText;
  };
  const tick = (now) => {
    if (isDone) {
      return;
    }
    const progress = Math.min(1, Math.max(0, (now - startAt) / duration));
    element.textContent = `${Math.round(from + (to - from) * (1 - (1 - progress) ** 3))}%`;
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      finish();
    }
  };
  element.textContent = `${from}%`;
  requestAnimationFrame(tick);
  setTimeout(finish, delay + duration + COUNT_UP_SAFETY_MS);
}

function createMorphBar(mix, { previousMix, removedId }) {
  const previousShares = new Map(previousMix.components.map((item) => [item.flavorId, item.share]));
  const bar = createElement('div', 'mix-bar');
  bar.setAttribute('aria-hidden', 'true');
  const segments = mix.components.map(({ flavorId, share }) => ({
    flavorId,
    from: previousShares.get(flavorId) ?? 0,
    to: share,
  }));
  const removedIndex = previousMix.components.findIndex((item) => item.flavorId === removedId);
  if (removedIndex >= 0) {
    segments.splice(Math.min(removedIndex, segments.length), 0, {
      flavorId: removedId,
      from: previousShares.get(removedId),
      to: 0,
      isLeaving: true,
    });
  }
  segments.forEach(({ flavorId, from, to, isLeaving }) => {
    const segment = createElement('span', `mix-bar-segment${isLeaving ? ' mix-bar-segment--leaving' : ''}`);
    segment.style.setProperty('--flavor-color', flavorColor(flavorId));
    segment.style.setProperty('flex-grow', String(from));
    segment.dataset.targetGrow = String(to);
    bar.append(segment);
  });
  return bar;
}

function insertLeavingRow(componentList, catalog, { previousMix, removedId }) {
  const removedIndex = previousMix.components.findIndex((item) => item.flavorId === removedId);
  if (removedIndex < 0) {
    return null;
  }
  const row = createElement('li', 'mix-component mix-component--leaving');
  row.setAttribute('aria-hidden', 'true');
  row.append(
    createElement('span', 'row-placeholder'),
    createFlavorName(catalog, removedId),
    createElement('span', 'mix-component-share', `${previousMix.components[removedIndex].share}%`),
    createElement('span', 'row-placeholder'),
  );
  componentList.insertBefore(row, componentList.children[removedIndex] ?? null);
  return row;
}

function startMorph({ bar, leavingRow }) {
  void bar.offsetWidth;
  bar.querySelectorAll('.mix-bar-segment').forEach((segment) => {
    segment.style.setProperty('flex-grow', segment.dataset.targetGrow);
  });
  setTimeout(() => {
    bar.querySelectorAll('.mix-bar-segment--leaving').forEach((segment) => segment.remove());
    leavingRow?.remove();
  }, MORPH_MS + COUNT_UP_SAFETY_MS);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createComponentRow({ flavorId, share }, { state, catalog, canPin }, { onPin, onUnpin, onExclude }) {
  const isPinned = state.required.includes(flavorId);
  const flavorName = label(catalog, flavorId);
  const item = createElement('li', `mix-component${isPinned ? ' mix-component--pinned' : ''}`);
  const pinButton = createIconButton(
    'pin-button',
    () => (isPinned ? onUnpin(flavorId) : onPin(flavorId)),
    isPinned ? 'lock-keyhole' : 'lock-open',
    t(isPinned ? 'unpin' : 'pin', { flavor: flavorName }),
  );
  pinButton.setAttribute('aria-pressed', String(isPinned));
  pinButton.disabled = !isPinned && !canPin;
  item.append(
    pinButton,
    createFlavorName(catalog, flavorId),
    createElement('span', 'mix-component-share', `${share}%`),
    createIconButton('exclude-button', () => onExclude(flavorId), 'x', t('remove', { flavor: flavorName })),
  );
  return item;
}

function createExcludedRow({ state, catalog }, { onInclude }) {
  if (state.excluded.length === 0) {
    return null;
  }
  const row = createElement('div', 'excluded-row');
  row.append(createElement('span', 'excluded-title', t('removed')));
  state.excluded.forEach((id) => {
    row.append(createButton('excluded-chip', () => onInclude(id), `${label(catalog, id)} ✕`));
  });
  return row;
}

function createLabeledIconButton(className, onClick, iconName, text) {
  const button = createButton(`icon-button ${className}`, onClick);
  button.append(createIcon(iconName), createElement('span', 'button-label', text));
  return button;
}

function createIconButton(className, onClick, iconName, accessibleLabel) {
  const button = createButton(`icon-button ${className}`, onClick);
  button.setAttribute('aria-label', accessibleLabel);
  button.title = accessibleLabel;
  button.append(createIcon(iconName));
  return button;
}

function createButton(className, onClick, text) {
  const button = createElement('button', className, text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function label(catalog, flavorId) {
  const flavor = catalog.flavorsById.get(flavorId);
  return flavor ? flavorLabel(flavor, getLang()) : flavorId;
}

function optional(element) {
  return element ? [element] : [];
}
