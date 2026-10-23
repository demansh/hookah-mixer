const STORAGE_KEY = 'hm.lang';
const SUPPORTED_LANGS = ['ru', 'en'];
const FALLBACK_LANG = 'ru';

let dictionaries = {};
let currentLang = FALLBACK_LANG;
const changeListeners = new Set();

export function initI18n() {
  const source = document.getElementById('i18n-data');
  dictionaries = JSON.parse(source?.textContent || '{}');
  currentLang = resolveInitialLang();
  applyTranslations();
}

export function t(key) {
  return dictionaries[currentLang]?.[key] ?? dictionaries[FALLBACK_LANG]?.[key] ?? key;
}

export function tList(key) {
  const value = t(key);
  return Array.isArray(value) ? value : [];
}

export function getLang() {
  return currentLang;
}

export function getOtherLang() {
  return SUPPORTED_LANGS.find((lang) => lang !== currentLang);
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) {
    return;
  }
  currentLang = lang;
  writeStoredLang(lang);
  applyTranslations();
  changeListeners.forEach((listener) => listener(lang));
}

export function onLangChange(listener) {
  changeListeners.add(listener);
}

export function localize(localizedValue) {
  if (typeof localizedValue === 'string') {
    return localizedValue;
  }
  return localizedValue?.[currentLang] || localizedValue?.[FALLBACK_LANG] || localizedValue?.en || '';
}

function resolveInitialLang() {
  const storedLang = readStoredLang();
  if (SUPPORTED_LANGS.includes(storedLang)) {
    return storedLang;
  }
  const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : FALLBACK_LANG;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.title = t('app_title');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    return;
  }
}
