import { t, localize } from '../i18n.js';
import { normalizeTerm, isIngredient } from '../flavors.js';

const STORAGE_KEY = 'hm.exclusions';

export function initExclusions({ root, catalog }) {
  const input = root.querySelector('#exclusion-input');
  const addButton = root.querySelector('#exclusion-add');
  const datalist = root.querySelector('#flavor-options');
  const chips = root.querySelector('#exclusion-chips');
  const counter = root.querySelector('#exclusions-count');
  const errorMessage = root.querySelector('#exclusion-error');

  const ingredientIds = new Set(catalog.flavors.filter(isIngredient).map((flavor) => flavor.id));
  const excludedIds = new Set(readStoredIds().filter((id) => ingredientIds.has(id)));

  const persist = () => {
    writeStoredIds([...excludedIds]);
  };

  const hideError = () => {
    errorMessage.hidden = true;
  };

  const renderChips = () => {
    counter.textContent = excludedIds.size > 0 ? `(${excludedIds.size})` : '';
    chips.replaceChildren(
      ...[...excludedIds].map((flavorId) => {
        const label = localize(catalog.flavorsById.get(flavorId).label);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip chip-removable';
        chip.textContent = `${label} ×`;
        chip.setAttribute('aria-label', `${t('exclusions_remove')}: ${label}`);
        chip.addEventListener('click', () => {
          excludedIds.delete(flavorId);
          persist();
          renderChips();
        });
        return chip;
      }),
    );
  };

  const renderOptions = () => {
    const labels = catalog.flavors
      .filter(isIngredient)
      .map((flavor) => localize(flavor.label))
      .sort((left, right) => left.localeCompare(right));
    datalist.replaceChildren(
      ...labels.map((label) => {
        const option = document.createElement('option');
        option.value = label;
        return option;
      }),
    );
  };

  const addFromInput = () => {
    const term = normalizeTerm(input.value);
    if (!term) {
      return;
    }
    const flavorId = catalog.termIndex.get(term);
    if (!flavorId || !ingredientIds.has(flavorId)) {
      errorMessage.textContent = t('exclusions_unknown');
      errorMessage.hidden = false;
      return;
    }
    excludedIds.add(flavorId);
    persist();
    input.value = '';
    hideError();
    renderChips();
  };

  addButton.addEventListener('click', addFromInput);
  input.addEventListener('input', hideError);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addFromInput();
    }
  });

  const refresh = () => {
    renderOptions();
    renderChips();
  };

  refresh();
  if (excludedIds.size > 0) {
    root.open = true;
  }

  return {
    getExcludedIds: () => [...excludedIds],
    refresh,
  };
}

function readStoredIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    return;
  }
}
