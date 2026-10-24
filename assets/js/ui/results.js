import { t, localize } from '../i18n.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderResult(container, result, catalog, actions) {
  if (result.mixes.length === 0) {
    renderStatus(container, 'no_results');
    return;
  }
  container.replaceChildren(...result.mixes.map((mix) => createMixCard(mix, catalog, actions)));
}

function createMixCard(mix, catalog, actions) {
  const card = document.createElement('article');
  card.className = `mix-card mix-card-${mix.tier}`;
  card.setAttribute('aria-label', t(`tier_${mix.tier}`));

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, catalog, actions)));

  card.append(components);

  if (mix.note) {
    const note = document.createElement('p');
    note.className = 'mix-note';
    note.textContent = localize(mix.note);
    card.append(note);
  }
  return card;
}

function createComponentRow({ flavorId, share }, catalog, actions) {
  const flavor = catalog.flavorsById.get(flavorId);
  const label = flavor ? localize(flavor.label) : flavorId;

  const row = document.createElement('li');
  row.className = 'component-row';

  const name = document.createElement('span');
  name.className = 'component-name';
  name.textContent = label;

  const shareValue = document.createElement('span');
  shareValue.className = 'component-share';
  shareValue.textContent = `${share}%`;

  const bar = document.createElement('span');
  bar.className = 'component-bar';
  const barFill = document.createElement('span');
  barFill.className = 'component-bar-fill';
  barFill.style.width = `${Math.min(Math.max(share, 0), 100)}%`;
  bar.append(barFill);

  const includeButton = createFlavorAction('➕', `${t('include_flavor')}: ${label}`, () => actions.onInclude(flavorId));
  const excludeButton = createFlavorAction('➖', `${t('exclude_flavor')}: ${label}`, () => actions.onExclude(flavorId));
  const buttons = document.createElement('span');
  buttons.className = 'flavor-actions';
  buttons.append(includeButton, excludeButton);

  row.append(name, shareValue, buttons, bar);
  return row;
}

function createFlavorAction(emoji, label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'flavor-action';
  button.textContent = emoji;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', onClick);
  return button;
}
