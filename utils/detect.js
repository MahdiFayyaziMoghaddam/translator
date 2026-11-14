// Language detection — Farsi FIRST, then script/diacritic clues, then English.
// Returns a language code the APIs understand: fa|en|fr|de|es|tr|ar (never 'other').

const FA_RE = /[؀-ۿﭐ-﷿]/; // Arabic/Persian script block (covers فارسی)
const AR_MARKERS = /[كٹیەؤئ]/; // chars typical of Arabic/Urdu, not Persian
const CLUES = [
  ['fr', /[àâçéèêëîïôûùüÿœæ]|(^|\s)(le|la|les|un|une|des|est|sont|avec|pour|dans|bonjour|merci)(?=\s|$)/i],
  ['de', /[äöüß]|(^|\s)(der|die|das|und|ist|nicht|danke|bitte)(?=\s|$)/i],
  ['es', /[ñ¿¡]|(^|\s)(el|los|las|una|está|gracias|hola)(?=\s|$)/i],
  ['tr', /[ğışçöü]|(^|\s)(bir|için|değil|merhaba)(?=\s|$)/i],
];

// ponytail: naive clues, upgrade to franc/CLD if accuracy matters.
export function detectLang(text) {
  if (!text || !text.trim()) return 'en';
  const t = text.trim();
  // Farsi priority: Persian-script wins (spec); Arabic-only markers -> Arabic
  if (FA_RE.test(t)) return AR_MARKERS.test(t) ? 'ar' : 'fa';
  for (const [code, re] of CLUES) {
    if (re.test(t)) return code;
  }
  return 'en'; // plain latin defaults to English (this extension's primary pair)
}

export const LANG_LABEL = {
  fa: 'فارسی',
  en: 'English',
  auto: 'Auto',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
  ar: 'العربية',
  tr: 'Türkçe',
};

export function labelFor(code) {
  return LANG_LABEL[code] || code;
}

// Given source lang, pick the other side of the En↔Fa pair by default
export function defaultTargetFor(src) {
  return src === 'fa' ? 'en' : 'fa';
}
