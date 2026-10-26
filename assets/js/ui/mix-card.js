import { t, localize } from '../i18n.js';
import { createIcon } from './icons.js';

export function createMixCard(mix, {
  catalog,
  flavorActions = null,
  pinnedIds = new Set(),
  canPinMore = false,
  footerActions = [],
  showTierLabel = false,
  caption = '',
}) {
  const card = document.createElement('article');
  card.className = `mix-card mix-card-${mix.tier}`;
  card.setAttribute('aria-label', t(`tier_${mix.tier}`));

  if (showTierLabel) {
    const tierLabel = document.createElement('p');
    tierLabel.className = 'mix-tier-label';
    tierLabel.textContent = t(`tier_${mix.tier}`);
    card.append(tierLabel);
  }

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, {
    catalog, flavorActions, pinnedIds, canPinMore,
  })));
  card.append(components);

  const noteText = mix.note ? localize(mix.note) : '';
  if (noteText || caption || footerActions.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'mix-footer';
    const texts = document.createElement('div');
    texts.className = 'mix-footer-texts';
    if (noteText) {
      const note = document.createElement('p');
      note.className = 'mix-note';
      note.textContent = noteText;
      texts.append(note);
    }
    if (caption) {
      const captionElement = document.createElement('p');
      captionElement.className = 'mix-caption';
      captionElement.textContent = caption;
      texts.append(captionElement);
    }
    const actions = document.createElement('div');
    actions.className = 'mix-actions';
    actions.append(...footerActions);
    footer.append(texts, actions);
    card.append(footer);
  }
  return card;
}

export function createIconButton(iconName, label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `icon-button ${className}`.trim();
  button.append(createIcon(iconName, 'icon-button-icon'));
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', onClick);
  return button;
}

export function createFavoriteButton(isActive, onToggle) {
  const button = createIconButton('star', '', () => applyState(onToggle()), 'favorite-button');
  const applyState = (active) => {
    const label = t(active ? 'remove_favorite' : 'add_favorite');
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', label);
    button.title = label;
  };
  applyState(isActive);
  return button;
}

function createComponentRow({ flavorId, share }, { catalog, flavorActions, pinnedIds, canPinMore }) {
  const flavor = catalog.flavorsById.get(flavorId);
  const label = flavor ? localize(flavor.label) : flavorId;
  const isPinned = pinnedIds.has(flavorId);

  const row = document.createElement('li');
  row.className = 'component-row';

  const name = document.createElement('span');
  name.className = 'component-name';
  name.textContent = label;
  if (isPinned) {
    const pinnedMark = createIcon('heart', 'pinned-mark');
    pinnedMark.setAttribute('aria-hidden', 'false');
    pinnedMark.setAttribute('role', 'img');
    pinnedMark.setAttribute('aria-label', t('pinned_flavor'));
    name.append(pinnedMark);
  }

  const shareValue = document.createElement('span');
  shareValue.className = 'component-share';
  shareValue.textContent = `${share}%`;

  const bar = document.createElement('span');
  bar.className = 'component-bar';
  const barFill = document.createElement('span');
  barFill.className = 'component-bar-fill';
  barFill.style.width = `${Math.min(Math.max(share, 0), 100)}%`;
  bar.append(barFill);

  if (!flavorActions) {
    row.classList.add('component-row-plain');
    row.append(name, shareValue, bar);
    return row;
  }

  const includeSlot = isPinned || !canPinMore
    ? createActionPlaceholder()
    : createFlavorAction('include', 'heart-plus', `${t('include_flavor')}: ${label}`, () => flavorActions.onInclude(flavorId));
  const excludeButton = createFlavorAction('exclude', 'heart-off', `${t('exclude_flavor')}: ${label}`, () => flavorActions.onExclude(flavorId));
  const buttons = document.createElement('span');
  buttons.className = 'flavor-actions';
  buttons.append(includeSlot, excludeButton);

  row.append(name, shareValue, buttons, bar);
  return row;
}

function createActionPlaceholder() {
  const placeholder = document.createElement('span');
  placeholder.className = 'flavor-action-placeholder';
  return placeholder;
}

function createFlavorAction(kind, iconName, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `flavor-action flavor-action-${kind}`;
  button.append(createIcon(iconName, 'flavor-action-icon'));
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', onClick);
  return button;
}
