import { initExampleChips } from './examples.js';

const MAX_QUERY_LENGTH = 300;

export function initForm({ form, concepts, flavors, onSubmit }) {
  const queryInput = form.querySelector('#query-input');
  const submitButton = form.querySelector('[type="submit"]');

  const examples = initExampleChips({
    container: form.querySelector('#example-chips'),
    concepts,
    flavors,
    onPick: (text) => {
      queryInput.value = text;
      form.requestSubmit();
    },
  });

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

  return { refresh: examples.reset };
}

function normalizeQuery(rawQuery) {
  return rawQuery.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}
