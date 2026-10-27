import { flavorLabel, isIngredient } from '../core/js/index.js';
import { TEMPERATURES, START_TABS, FLAVOR_CATEGORIES, HIDDEN_TASTE_FLAVORS, MIN_SHELF_SIZE } from './options.js';
import { t, getLang } from './i18n.js';
import { createIcon } from './icons.js';
import { CONCEPT_EMOJI } from './concept-emoji.js';

export function conceptLabel(concept) {
  const phrase = concept.phrases[getLang()][0] ?? concept.phrases.ru[0] ?? concept.id;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function renderStart(container, { concepts, catalog, startTab, shelf }, actions) {
  const tabs = createElement('div', 'start-tabs');
  tabs.setAttribute('role', 'group');
  START_TABS.forEach((tab) => {
    const label = tab.id === 'shelf' && shelf.size > 0 ? `${t(tab.labelKey)} · ${shelf.size}` : t(tab.labelKey);
    const button = createButton('start-tab', () => actions.onSetStartTab(tab.id), label);
    button.setAttribute('aria-pressed', String(tab.id === startTab));
    tabs.append(button);
  });
  container.replaceChildren(tabs, ...createStartContent({ concepts, catalog, startTab, shelf }, actions));
}

function createStartContent({ concepts, catalog, startTab, shelf }, actions) {
  if (startTab === 'taste') {
    return [
      createElement('p', 'screen-hint', t('tasteHint')),
      ...createFlavorGroups(catalog, {
        hiddenIds: HIDDEN_TASTE_FLAVORS,
        createChip: (id, name) => createButton('flavor-chip', () => actions.onPickFlavor(id), name),
      }),
    ];
  }
  if (startTab === 'shelf') {
    return [
      createElement('p', 'screen-hint', t('shelfHint')),
      ...createFlavorGroups(catalog, {
        hiddenIds: new Set(),
        createChip: (id, name) => {
          const chip = createButton('flavor-chip shelf-chip', () => actions.onToggleShelf(id), name);
          chip.setAttribute('aria-pressed', String(shelf.has(id)));
          return chip;
        },
      }),
    ];
  }
  return [createElement('p', 'screen-hint', t('startHint')), createConceptGrid(concepts, actions)];
}

function createConceptGrid(concepts, { onPickConcept }) {
  const grid = createElement('div', 'concept-grid');
  concepts.forEach((concept) => grid.append(createConceptButton(concept, () => onPickConcept(concept.id))));
  return grid;
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
  const { mix, isFallbackTier, title, nothingFoundKey } = view;
  const card = createElement('article', `mix-card mix-card--${mix?.tier ?? 'none'}`);
  if (title) {
    card.append(createElement('h2', 'mix-concept', title));
  }
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

export function renderBottomActions(container, { isMixScreen, startTab, shelfSize }, actions) {
  const { onSurprise, onShelfMix, onReset, onAnother } = actions;
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
    createIconButton('another-button', onAnother, 'refresh', t('anotherMix')),
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
    'heart',
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
