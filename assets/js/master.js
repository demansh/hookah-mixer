import { TEMPERATURES } from './options.js';
import { t } from './i18n.js';

const EVENT_MOODS = {
  puzzled: { face: '🤨', labelKey: 'moodPuzzled' },
  dizzy: { face: '😵', labelKey: 'moodDizzy' },
};

export function resolveMood({ hasMix = true, wrapped = false, temperature }) {
  if (!hasMix) {
    return EVENT_MOODS.puzzled;
  }
  if (wrapped) {
    return EVENT_MOODS.dizzy;
  }
  const { face, moodKey } = TEMPERATURES.find((item) => item.tier === temperature);
  return { face, labelKey: moodKey };
}

export function showMaster(element, { face, labelKey }) {
  const label = t(labelKey);
  element.textContent = face;
  element.setAttribute('aria-label', label);
  element.title = label;
  element.classList.remove('is-changing');
  void element.offsetWidth;
  element.classList.add('is-changing');
}
