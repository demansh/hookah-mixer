import { t, localize } from '../i18n.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderResult(container, result, catalog) {
  if (result.mixes.length === 0) {
    renderStatus(container, 'no_results');
    return;
  }
  container.replaceChildren(...result.mixes.map((mix) => createMixCard(mix, catalog)));
}

function createMixCard(mix, catalog) {
  const card = document.createElement('article');
  card.className = `mix-card mix-card-${mix.tier}`;
  card.setAttribute('aria-label', t(`tier_${mix.tier}`));

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, catalog)));

  card.append(components);

  if (mix.note) {
    const note = document.createElement('p');
    note.className = 'mix-note';
    note.textContent = localize(mix.note);
    card.append(note);
  }
  return card;
}

function createComponentRow({ flavorId, share }, catalog) {
  const flavor = catalog.flavorsById.get(flavorId);

  const row = document.createElement('li');
  row.className = 'component-row';

  const name = document.createElement('span');
  name.className = 'component-name';
  name.textContent = flavor ? localize(flavor.label) : flavorId;

  const shareValue = document.createElement('span');
  shareValue.className = 'component-share';
  shareValue.textContent = `${share}%`;

  const bar = document.createElement('span');
  bar.className = 'component-bar';
  const barFill = document.createElement('span');
  barFill.className = 'component-bar-fill';
  barFill.style.width = `${Math.min(Math.max(share, 0), 100)}%`;
  bar.append(barFill);

  row.append(name, shareValue, bar);
  return row;
}
