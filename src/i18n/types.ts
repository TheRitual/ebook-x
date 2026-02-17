export const SUPPORTED_LOCALES = [
  "en",
  "pl",
  "de",
  "fr",
  "es",
  "it",
  "pt",
  "ru",
  "zh",
  "ja",
] as const;

export type LocaleId = (typeof SUPPORTED_LOCALES)[number];

export type AppLocaleSetting = "system" | LocaleId;
export type ExportLocaleSetting = "system" | LocaleId;

export const LOCALE_NAMES: Record<LocaleId, string> = {
  en: "English",
  pl: "Polski",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
};
