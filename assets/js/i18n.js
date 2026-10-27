const STORAGE_KEY = 'hm.lang';
const SUPPORTED_LANGS = ['ru', 'en'];
const FALLBACK_LANG = 'en';

const DICTIONARIES = {
  ru: {
    langSwitch: 'EN',
    langSwitchLabel: 'Switch to English',
    startHint: 'Выберите настроение — или доверьтесь случаю кнопкой внизу.',
    tabMood: 'Настроение',
    tabTaste: 'Вкус',
    tabShelf: 'Шкаф',
    tabFavorites: 'Избранное',
    favoritesEmpty: 'Здесь появятся миксы, отмеченные ☆ на карточке.',
    saveFavorite: 'В избранное',
    removeFavorite: 'Убрать из избранного',
    byFlavor: 'По вкусу',
    shareMix: 'Поделиться',
    copied: 'Скопировано — можно вставить в сообщение',
    sharedMix: 'Присланный микс',
    shelfSelected: 'В шкафу ({count})',
    shelfEmpty: 'Шкаф пока пуст — выберите букву и отметьте ароматы.',
    shelfRemove: 'Убрать из шкафа: {flavor}',
    shelfLetters: 'Первая буква аромата',
    shelfHint: 'Отметьте ароматы, которые есть у вас, — мастер соберёт микс только из них.',
    shelfMix: '🗄️ Микс из шкафа',
    shelfNeedMore: 'Отметьте хотя бы {count} аромата',
    fromShelf: 'Из шкафа',
    shelfNothingFound: 'Из шкафа так не собрать. Добавьте в шкаф ароматы из других категорий.',
    categoryCooling: 'Холодок',
    tasteHint: 'Выберите аромат — мастер соберёт микс с ним.',
    categoryOrchard: 'Садовые фрукты',
    categoryTropical: 'Тропические фрукты',
    categoryCitrus: 'Цитрусы',
    categoryBerry: 'Ягоды',
    categoryMelon: 'Бахчевые',
    categoryVegetable: 'Овощи',
    categoryHerbal: 'Травы',
    categoryFloral: 'Цветы',
    categorySpice: 'Пряности',
    categoryTea: 'Чай',
    categoryDrink: 'Напитки',
    categoryAlcohol: 'Алкоголь',
    categoryDessert: 'Десерты',
    categoryBakery: 'Выпечка',
    categoryCandy: 'Конфеты',
    categoryNut: 'Орехи',
    categoryTobacco: 'Табак',
    categoryOther: 'Другое',
    randomMix: '🎲 Случайный микс',
    randomMixTitle: 'Случайный микс',
    fallbackTier: 'На этой температуре вариантов нет — показан ближайший.',
    nothingFound: 'Ничего не нашлось. Верните убранный аромат или открепите один.',
    goHome: 'На главный экран',
    anotherMix: 'Другой микс',
    thermometer: 'Температура мастера',
    pin: 'Оставить во всех миксах: {flavor}',
    unpin: 'Открепить: {flavor}',
    remove: 'Убрать: {flavor}',
    removed: 'Убрано:',
    loadError: 'Не удалось загрузить базу ароматов. Обновите страницу.',
    engineError: 'Не получилось подобрать микс. Вернитесь назад и попробуйте другое настроение.',
    moodClassic: 'Мастер спокоен',
    moodBalanced: 'Мастер экспериментирует',
    moodBold: 'Мастер бредит',
    moodPuzzled: 'Мастер недоумевает: так не сочетается',
    moodDizzy: 'Идеи кончились, мастер начинает сначала',
    temperatureClassic: '36,6°',
    temperatureBalanced: '37,2°',
    temperatureBold: '38°',
  },
  en: {
    langSwitch: 'RU',
    langSwitchLabel: 'Переключить на русский',
    startHint: 'Pick a mood — or trust your luck with the button below.',
    tabMood: 'Mood',
    tabTaste: 'Flavor',
    tabShelf: 'Shelf',
    tabFavorites: 'Favorites',
    favoritesEmpty: 'Mixes you star ☆ on a card will appear here.',
    saveFavorite: 'Save to favorites',
    removeFavorite: 'Remove from favorites',
    byFlavor: 'By flavor',
    shareMix: 'Share',
    copied: 'Copied — paste it into a message',
    sharedMix: 'Shared mix',
    shelfSelected: 'On the shelf ({count})',
    shelfEmpty: 'The shelf is empty — pick a letter and mark flavors.',
    shelfRemove: 'Remove from the shelf: {flavor}',
    shelfLetters: 'First letter of the flavor',
    shelfHint: 'Mark the flavors you have — the master will mix only from them.',
    shelfMix: '🗄️ Mix from my shelf',
    shelfNeedMore: 'Mark at least {count} flavors',
    fromShelf: 'From the shelf',
    shelfNothingFound: 'Nothing fits from the shelf. Add flavors from other categories.',
    categoryCooling: 'Cooling',
    tasteHint: 'Pick a flavor — the master will build a mix around it.',
    categoryOrchard: 'Orchard fruits',
    categoryTropical: 'Tropical fruits',
    categoryCitrus: 'Citrus',
    categoryBerry: 'Berries',
    categoryMelon: 'Melons',
    categoryVegetable: 'Vegetables',
    categoryHerbal: 'Herbs',
    categoryFloral: 'Flowers',
    categorySpice: 'Spices',
    categoryTea: 'Tea',
    categoryDrink: 'Drinks',
    categoryAlcohol: 'Alcohol',
    categoryDessert: 'Desserts',
    categoryBakery: 'Bakery',
    categoryCandy: 'Candy',
    categoryNut: 'Nuts',
    categoryTobacco: 'Tobacco',
    categoryOther: 'Other',
    randomMix: '🎲 Random mix',
    randomMixTitle: 'Random mix',
    fallbackTier: 'Nothing at this temperature — showing the closest one.',
    nothingFound: 'Nothing found. Bring back a removed flavor or unpin one.',
    goHome: 'Back to start',
    anotherMix: 'Another mix',
    thermometer: "Master's temperature",
    pin: 'Keep in every mix: {flavor}',
    unpin: 'Unpin: {flavor}',
    remove: 'Remove: {flavor}',
    removed: 'Removed:',
    loadError: 'Could not load the flavor base. Please reload the page.',
    engineError: 'Could not pick a mix. Go back and try another mood.',
    moodClassic: 'The master is calm',
    moodBalanced: 'The master is experimenting',
    moodBold: 'The master is delirious',
    moodPuzzled: "The master is puzzled: these don't go together",
    moodDizzy: 'Out of ideas, the master starts over',
    temperatureClassic: '36.6°',
    temperatureBalanced: '37.2°',
    temperatureBold: '38°',
  },
};

let currentLang = FALLBACK_LANG;

export function initLang() {
  currentLang = resolveInitialLang();
  document.documentElement.lang = currentLang;
}

export function getLang() {
  return currentLang;
}

export function toggleLang() {
  currentLang = SUPPORTED_LANGS.find((lang) => lang !== currentLang);
  document.documentElement.lang = currentLang;
  try {
    localStorage.setItem(STORAGE_KEY, currentLang);
  } catch (error) {
    console.warn('Language preference was not saved', error);
  }
}

export function t(key, params = {}) {
  const template = DICTIONARIES[currentLang][key] ?? DICTIONARIES[FALLBACK_LANG][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}

function resolveInitialLang() {
  const storedLang = readStoredLang();
  if (SUPPORTED_LANGS.includes(storedLang)) {
    return storedLang;
  }
  return (navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : FALLBACK_LANG;
}

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
