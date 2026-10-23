import { t, tList } from '../i18n.js';
import { initExclusions } from './exclusions.js';

const MAX_QUERY_LENGTH = 120;

export function initForm({ form, catalog, onSubmit }) {
  const queryInput = form.querySelector('#query-input');
  const queryError = form.querySelector('#query-error');
  const exampleChips = form.querySelector('#example-chips');
  const submitButton = form.querySelector('[type="submit"]');
  const exclusions = initExclusions({ root: form.querySelector('#exclusions'), catalog });

  const hideError = () => {
    queryError.hidden = true;
  };

  const renderExamples = () => {
    exampleChips.replaceChildren(
      ...tList('examples').map((example) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = example;
        chip.addEventListener('click', () => {
          queryInput.value = example;
          hideError();
          queryInput.focus();
        });
        return chip;
      }),
    );
  };

  queryInput.addEventListener('input', hideError);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = normalizeQuery(queryInput.value);
    if (!query) {
      queryError.textContent = t('query_error_empty');
      queryError.hidden = false;
      queryInput.focus();
      return;
    }
    queryInput.blur();
    submitButton.disabled = true;
    try {
      await onSubmit({ query, excludedIds: exclusions.getExcludedIds() });
    } finally {
      submitButton.disabled = false;
    }
  });

  const refresh = () => {
    renderExamples();
    exclusions.refresh();
  };

  renderExamples();
  return { refresh };
}

function normalizeQuery(rawQuery) {
  return rawQuery.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}
