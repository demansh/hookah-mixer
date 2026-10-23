import { t, tList } from '../i18n.js';

const MAX_QUERY_LENGTH = 120;

export function initForm({ form, brands, onSubmit }) {
  const queryInput = form.querySelector('#query-input');
  const queryError = form.querySelector('#query-error');
  const strengthInput = form.querySelector('#strength-input');
  const strengthOutput = form.querySelector('#strength-output');
  const exampleChips = form.querySelector('#example-chips');
  const brandOptions = form.querySelector('#brand-options');
  const submitButton = form.querySelector('[type="submit"]');

  renderBrandOptions(brandOptions, brands);

  const updateStrengthOutput = () => {
    const strength = Number(strengthInput.value);
    strengthOutput.textContent = `${strength} · ${t(strengthLabelKey(strength))}`;
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

  const showError = (messageKey) => {
    queryError.textContent = t(messageKey);
    queryError.hidden = false;
  };

  const hideError = () => {
    queryError.hidden = true;
  };

  strengthInput.addEventListener('input', updateStrengthOutput);
  queryInput.addEventListener('input', hideError);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = normalizeQuery(queryInput.value);
    if (!query) {
      showError('query_error_empty');
      queryInput.focus();
      return;
    }
    queryInput.blur();
    submitButton.disabled = true;
    try {
      await onSubmit({
        query,
        strength: Number(strengthInput.value),
        brands: [...brandOptions.querySelectorAll('input:checked')].map((input) => input.value),
      });
    } finally {
      submitButton.disabled = false;
    }
  });

  const refresh = () => {
    updateStrengthOutput();
    renderExamples();
  };

  refresh();
  return { refresh };
}

function renderBrandOptions(container, brands) {
  const sortedBrands = [...brands].sort((left, right) => left.name.localeCompare(right.name));
  container.replaceChildren(
    ...sortedBrands.map((brand) => {
      const label = document.createElement('label');
      label.className = 'chip-toggle';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'brands';
      checkbox.value = brand.id;
      const caption = document.createElement('span');
      caption.textContent = brand.name;
      label.append(checkbox, caption);
      return label;
    }),
  );
}

function normalizeQuery(rawQuery) {
  return rawQuery.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

function strengthLabelKey(strength) {
  if (strength <= 3) return 'strength_light';
  if (strength <= 6) return 'strength_medium';
  if (strength <= 8) return 'strength_strong';
  return 'strength_extra';
}
