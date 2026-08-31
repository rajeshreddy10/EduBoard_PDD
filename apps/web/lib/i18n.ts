const LANG_KEY = 'eduboard-language';
const SPELL_LANG_KEY = 'eduboard-spell-lang';

export type LangCode = 'en' | 'es' | 'fr' | 'de' | 'hi' | 'ja' | 'zh' | 'ko';

export const LANGUAGES = [
  { code: 'en' as LangCode, name: 'English', native: 'English', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: 'es' as LangCode, name: 'Spanish', native: 'Español', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'fr' as LangCode, name: 'French', native: 'Français', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'de' as LangCode, name: 'German', native: 'Deutsch', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'hi' as LangCode, name: 'Hindi', native: 'हिन्दी', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { code: 'ja' as LangCode, name: 'Japanese', native: '日本語', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { code: 'zh' as LangCode, name: 'Chinese', native: '中文', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { code: 'ko' as LangCode, name: 'Korean', native: '한국어', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
];

export function getStoredLanguage(): LangCode {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(LANG_KEY) as LangCode) || 'en';
}

export function getStoredSpellLang(): LangCode {
  if (typeof window === 'undefined') return 'en';
  return (localStorage.getItem(SPELL_LANG_KEY) as LangCode) || 'en';
}

export function applyLanguage(code: LangCode) {
  localStorage.setItem(LANG_KEY, code);
  document.documentElement.lang = code;
}

export function applySpellLang(code: LangCode) {
  localStorage.setItem(SPELL_LANG_KEY, code);
}
