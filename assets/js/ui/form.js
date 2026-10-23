import { tList } from '../i18n.js';

const MAX_QUERY_LENGTH = 120;

export function initForm({ form, onSubmit }) {
  const queryInput = form.querySelector('#query-input');
  const exampleChips = form.querySelector('#example-chips');
  const submitButton = form.querySelector('[type="submit"]');

  const renderExamples = () => {
    exampleChips.replaceChildren(
      ...tList('examples').map((example) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = example;
        chip.addEventListener('click', () => {
          queryInput.value = example;
          form.requestSubmit();
        });
        return chip;
      }),
    );
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = normalizeQuery(queryInput.value);
    queryInput.blur();
    submitButton.disabled = true;
    try {
      await onSubmit({ query });
    } finally {
      submitButton.disabled = false;
    }
  });

  renderExamples();
  return { refresh: renderExamples };
}

function normalizeQuery(rawQuery) {
  return rawQuery.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}
