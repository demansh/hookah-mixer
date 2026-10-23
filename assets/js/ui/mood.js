import { t } from '../i18n.js';

const MOOD_EMOJI = {
  wizard: '🧙',
  confused: '😕',
  happy: '😊',
  inspired: '🤩',
  partial: '🤔',
  excluding: '🧐',
  puzzled: '🤨',
  sweat: '😅',
  nervous: '😰',
  exhausted: '🥵',
  dizzy: '😵',
};
const NERVOUS_REPEATS = 2;
const EXHAUSTED_REPEATS = 4;

export function resolveMood({ query, profile, repeatCount = 0, wrapped = false }) {
  if (!query.trim()) {
    return 'wizard';
  }
  if (wrapped) {
    return 'dizzy';
  }
  if (repeatCount >= EXHAUSTED_REPEATS) {
    return 'exhausted';
  }
  if (repeatCount >= NERVOUS_REPEATS) {
    return 'nervous';
  }
  if (repeatCount > 0) {
    return 'sweat';
  }
  if (profile.contradictions.length > 0) {
    return 'puzzled';
  }
  if (profile.excluded.size > 0) {
    return 'excluding';
  }
  if (profile.isEmpty || profile.isRandom) {
    return 'confused';
  }
  const positiveMatches = profile.matched.filter((match) => !match.negated);
  if (positiveMatches.some((match) => match.type === 'concept' && !match.partial)) {
    return 'inspired';
  }
  if (positiveMatches.some((match) => match.type !== 'concept')) {
    return 'happy';
  }
  return 'partial';
}

export function createMoodIndicator(element) {
  const emoji = element.querySelector('.mood-emoji');
  const label = element.querySelector('.mood-label');
  let currentMood = null;

  const applyLabel = () => {
    const text = t(`mood_${currentMood}`);
    label.textContent = text;
    element.title = text;
  };

  return {
    set(mood) {
      if (mood === currentMood) {
        return;
      }
      currentMood = mood;
      emoji.textContent = MOOD_EMOJI[mood];
      applyLabel();
      element.classList.remove('is-changing');
      void element.offsetWidth;
      element.classList.add('is-changing');
    },
    refresh() {
      if (currentMood) {
        applyLabel();
      }
    },
  };
}
