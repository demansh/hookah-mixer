export const TEMPERATURES = [
  { tier: 'classic', labelKey: 'temperatureClassic', face: '😌', moodKey: 'moodClassic' },
  { tier: 'balanced', labelKey: 'temperatureBalanced', face: '🤒', moodKey: 'moodBalanced' },
  { tier: 'bold', labelKey: 'temperatureBold', face: '🥴', moodKey: 'moodBold' },
];

export const DEFAULT_TEMPERATURE = 'classic';

export const START_TABS = [
  { id: 'mood', labelKey: 'tabMood' },
  { id: 'taste', labelKey: 'tabTaste' },
];

export const HIDDEN_TASTE_FLAVORS = new Set(['cooling']);

export const FLAVOR_CATEGORIES = [
  { id: 'fruit_orchard', emoji: '🍎', labelKey: 'categoryOrchard' },
  { id: 'fruit_tropical', emoji: '🥭', labelKey: 'categoryTropical' },
  { id: 'citrus', emoji: '🍋', labelKey: 'categoryCitrus' },
  { id: 'berry', emoji: '🫐', labelKey: 'categoryBerry' },
  { id: 'melon', emoji: '🍉', labelKey: 'categoryMelon' },
  { id: 'vegetable', emoji: '🥒', labelKey: 'categoryVegetable' },
  { id: 'herbal', emoji: '🌿', labelKey: 'categoryHerbal' },
  { id: 'floral', emoji: '🌸', labelKey: 'categoryFloral' },
  { id: 'spice', emoji: '🌶️', labelKey: 'categorySpice' },
  { id: 'tea', emoji: '🍵', labelKey: 'categoryTea' },
  { id: 'drink', emoji: '🥤', labelKey: 'categoryDrink' },
  { id: 'alcohol', emoji: '🍷', labelKey: 'categoryAlcohol' },
  { id: 'dessert', emoji: '🍰', labelKey: 'categoryDessert' },
  { id: 'bakery', emoji: '🥐', labelKey: 'categoryBakery' },
  { id: 'candy', emoji: '🍬', labelKey: 'categoryCandy' },
  { id: 'nut', emoji: '🥜', labelKey: 'categoryNut' },
  { id: 'tobacco', emoji: '🍂', labelKey: 'categoryTobacco' },
];
