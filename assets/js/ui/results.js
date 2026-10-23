import { t, localize } from '../i18n.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderMixes(container, mixes, catalog) {
  if (mixes.length === 0) {
    renderStatus(container, 'no_results');
    return;
  }
  const title = document.createElement('h2');
  title.className = 'results-title';
  title.textContent = t('results_title');
  container.replaceChildren(title, ...mixes.map((mix) => createMixCard(mix, catalog)));
}

function createMixCard(mix, catalog) {
  const card = document.createElement('article');
  card.className = 'mix-card';

  const title = document.createElement('h3');
  title.className = 'mix-card-title';
  title.textContent = localize(mix.title);

  const meta = document.createElement('p');
  meta.className = 'mix-meta';
  meta.append(
    createMetaItem(t('mix_strength'), String(mix.strength)),
    createMetaItem(t('mix_bowl'), t(`bowl_${mix.bowl}`)),
  );

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, catalog)));

  card.append(title, meta, components);
  return card;
}

function createMetaItem(label, value) {
  const item = document.createElement('span');
  item.textContent = `${label}: ${value}`;
  return item;
}

function createComponentRow({ tobaccoId, share }, catalog) {
  const tobacco = catalog.tobaccosById.get(tobaccoId);
  const brand = catalog.brandsById.get(tobacco?.brand);

  const row = document.createElement('li');
  row.className = 'component-row';

  const name = document.createElement('span');
  name.className = 'component-name';
  name.textContent = tobacco ? localize(tobacco.name) : tobaccoId;

  const brandName = document.createElement('span');
  brandName.className = 'component-brand';
  brandName.textContent = [brand?.name, tobacco?.line].filter(Boolean).join(' · ');

  const shareValue = document.createElement('span');
  shareValue.className = 'component-share';
  shareValue.textContent = `${share}%`;

  const bar = document.createElement('span');
  bar.className = 'component-bar';
  const barFill = document.createElement('span');
  barFill.className = 'component-bar-fill';
  barFill.style.width = `${Math.min(Math.max(share, 0), 100)}%`;
  bar.append(barFill);

  row.append(name, shareValue, brandName, bar);
  return row;
}
