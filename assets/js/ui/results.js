import { t, localize } from '../i18n.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderResult(container, result, catalog, onExclude) {
  if (result.mixes.length === 0) {
    renderStatus(container, 'no_results');
    return;
  }
  container.replaceChildren(...result.mixes.map((mix) => createMixCard(mix, catalog, onExclude)));
}

function createMixCard(mix, catalog, onExclude) {
  const card = document.createElement('article');
  card.className = `mix-card mix-card-${mix.tier}`;
  card.setAttribute('aria-label', t(`tier_${mix.tier}`));

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, catalog, onExclude)));

  card.append(components);

  if (mix.note) {
    const note = document.createElement('p');
    note.className = 'mix-note';
    note.textContent = localize(mix.note);
    card.append(note);
  }
  return card;
}

function createComponentRow({ flavorId, share }, catalog, onExclude) {
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

  const excludeButton = document.createElement('button');
  excludeButton.type = 'button';
  excludeButton.className = 'exclude-button';
  excludeButton.textContent = '−';
  excludeButton.setAttribute('aria-label', `${t('exclude_flavor')}: ${label}`);
  excludeButton.addEventListener('click', () => onExclude(flavorId));

  row.append(name, shareValue, excludeButton, bar);
  return row;
}
