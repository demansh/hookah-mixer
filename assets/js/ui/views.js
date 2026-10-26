import { t } from '../i18n.js';
import { createIcon } from './icons.js';
import { createMixCard, createIconButton, createFavoriteButton } from './mix-card.js';

export function renderMixView(container, { catalog, mix, query, isFavorite, onToggleFavorite, onShare, onSimilar, onBack }) {
  const header = createViewHeader(t('mix_title'), onBack);
  if (!mix) {
    container.replaceChildren(header, createMessage(t('mix_not_found')));
    return;
  }
  const card = createMixCard(mix, {
    catalog,
    showTierLabel: true,
    caption: query ? `${t('query_caption')}: «${query}»` : '',
    footerActions: [
      createFavoriteButton(isFavorite, onToggleFavorite),
      createIconButton('share-2', t('share_mix'), onShare),
    ],
  });
  const similarButton = document.createElement('button');
  similarButton.type = 'button';
  similarButton.className = 'primary-button';
  similarButton.append(createIcon('sparkles', 'primary-button-icon'), document.createTextNode(t('similar_mixes')));
  similarButton.addEventListener('click', onSimilar);
  container.replaceChildren(header, card, similarButton);
}

export function renderFavoritesView(container, { catalog, items, onOpen, onShare, onDelete, onBack }) {
  const header = createViewHeader(t('favorites_title'), onBack);
  if (items.length === 0) {
    container.replaceChildren(header, createMessage(t('favorites_empty')));
    return;
  }
  const cards = items.map(({ mix, query }) => createMixCard(mix, {
    catalog,
    caption: query ? `${t('query_caption')}: «${query}»` : '',
    footerActions: [
      createIconButton('maximize-2', t('open_mix'), () => onOpen(mix, query)),
      createIconButton('share-2', t('share_mix'), () => onShare(mix, query)),
      createIconButton('trash-2', t('delete_mix'), () => onDelete(mix), 'danger-button'),
    ],
  }));
  const list = document.createElement('div');
  list.className = 'favorites-list';
  list.append(...cards);
  container.replaceChildren(header, list);
}

function createViewHeader(title, onBack) {
  const header = document.createElement('div');
  header.className = 'view-header';
  const backButton = createIconButton('arrow-left', t('back'), onBack, 'back-button');
  const heading = document.createElement('h2');
  heading.className = 'view-title';
  heading.textContent = title;
  header.append(backButton, heading);
  return header;
}

function createMessage(text) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = text;
  return message;
}
