import { t } from '../i18n.js';
import { MAX_REQUIRED_FLAVORS } from '../engine/profile.js';
import { isFavorite } from '../favorites.js';
import { createMixCard, createIconButton, createFavoriteButton } from './mix-card.js';

export function renderStatus(container, messageKey) {
  const message = document.createElement('p');
  message.className = 'status-message';
  message.textContent = t(messageKey);
  container.replaceChildren(message);
}

export function renderResult(container, result, catalog, { flavorActions, mixActions }) {
  if (result.mixes.length === 0) {
    renderStatus(container, 'no_results');
    return;
  }
  const pinnedIds = new Set(result.profile.isRandom ? [] : result.profile.required);
  container.replaceChildren(...result.mixes.map((mix) => createMixCard(mix, {
    catalog,
    flavorActions,
    pinnedIds,
    canPinMore: pinnedIds.size < MAX_REQUIRED_FLAVORS,
    footerActions: [
      createFavoriteButton(isFavorite(mix.components), () => mixActions.onToggleFavorite(mix)),
      createIconButton('share-2', t('share_mix'), () => mixActions.onShare(mix)),
      createIconButton('maximize-2', t('open_mix'), () => mixActions.onOpen(mix)),
    ],
  })));
}
