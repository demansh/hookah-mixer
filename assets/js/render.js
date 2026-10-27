import { flavorLabel, isIngredient, noteForMix } from '../core/js/index.js';
import { TEMPERATURES, START_TABS, FLAVOR_CATEGORIES, HIDDEN_TASTE_FLAVORS, MIN_SHELF_SIZE } from './options.js';
import { t, getLang } from './i18n.js';
import { createIcon } from './icons.js';
import { CONCEPT_EMOJI } from './concept-emoji.js';

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

function createConceptGrid(concepts, { onPickConcept }) {
  const grid = createElement('div', 'concept-grid');
  concepts.forEach((concept) => grid.append(createConceptButton(concept, () => onPickConcept(concept.id))));
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
      createElement('span', 'mix-component-name', label(catalog, flavorId)),
      createElement('span', 'mix-component-share', `${share}%`),
    );
    rows.append(row);
  });
  card.append(header, rows);
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

function createConceptButton(concept, onClick) {
  const emoji = CONCEPT_EMOJI[concept.id];
  if (!emoji) {
    return createButton('concept-chip', onClick, conceptLabel(concept));
  }
  const button = createButton('concept-emoji', onClick, emoji);
  button.setAttribute('aria-label', conceptLabel(concept));
  button.title = conceptLabel(concept);
  return button;
}

export function renderMix(container, view, actions) {
  const { mix, isFallbackTier, title, nothingFoundKey, isSaved } = view;
  const card = createElement('article', `mix-card mix-card--${mix?.tier ?? 'none'}`);
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
  if (mix) {
    const componentList = createElement('ul', 'mix-components');
    mix.components.forEach((component) => componentList.append(createComponentRow(component, view, actions)));
    card.append(componentList);
    const noteText = mix.note?.[getLang()];
    if (noteText) {
      card.append(createElement('p', 'mix-note', noteText));
    }
  } else {
    card.append(createElement('p', 'mix-hint', t(nothingFoundKey)));
  }
  container.replaceChildren(card, ...optional(createExcludedRow(view, actions)));
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
  container.replaceChildren(
    createEmojiButton('reset-button', onReset, '🏠', t('goHome')),
    createLabeledIconButton('another-button', onAnother, 'refresh', t('anotherMix')),
  );
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
    createElement('span', 'mix-component-name', flavorName),
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

function createEmojiButton(className, onClick, emoji, accessibleLabel) {
  const button = createButton(`icon-button emoji-button ${className}`, onClick, emoji);
  button.setAttribute('aria-label', accessibleLabel);
  button.title = accessibleLabel;
  return button;
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
