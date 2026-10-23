import { t, localize, getLang } from '../i18n.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderResult(container, result, catalog) {
  if (result.profile.isEmpty) {
    renderStatus(container, 'not_understood');
    return;
  }
  const understood = createUnderstoodLine(result.profile, catalog);
  if (result.mixes.length === 0) {
    const message = document.createElement('p');
    message.className = 'status-message';
    message.textContent = t('no_results');
    container.replaceChildren(understood, message);
    return;
  }
  const title = document.createElement('h2');
  title.className = 'results-title';
  title.textContent = t('results_title');
  container.replaceChildren(title, understood, ...result.mixes.map((mix) => createMixCard(mix, catalog)));
}

function createUnderstoodLine(profile, catalog) {
  const conceptsById = new Map(catalog.concepts.map((concept) => [concept.id, concept]));
  const labels = profile.matched.map(({ type, id, negated }) => {
    const label = type === 'concept'
      ? `«${conceptsById.get(id).phrases[getLang()]?.[0] ?? conceptsById.get(id).phrases.ru[0]}»`
      : localize(catalog.flavorsById.get(id).label);
    return negated ? `${t('without')}: ${label}` : label;
  });
  const line = document.createElement('p');
  line.className = 'understood-line';
  line.textContent = `${t('understood_as')} ${labels.join(' · ')}`;
  return line;
}

function createMixCard(mix, catalog) {
  const card = document.createElement('article');
  card.className = `mix-card mix-card-${mix.tier}`;

  const tier = document.createElement('p');
  tier.className = 'mix-tier';
  tier.textContent = t(`tier_${mix.tier}`);

  const components = document.createElement('ul');
  components.className = 'mix-components';
  components.append(...mix.components.map((component) => createComponentRow(component, catalog)));

  card.append(tier, components);

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
