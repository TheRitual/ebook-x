import process from "node:process";
import type {
  LocaleId,
  AppLocaleSetting,
  ExportLocaleSetting,
} from "./types.js";
import { SUPPORTED_LOCALES, LOCALE_NAMES } from "./types.js";
import {
  getAppTranslations,
  getExportTranslations,
  type AppTranslations,
  type ExportTranslations,
} from "./translations.js";

export type { LocaleId, AppLocaleSetting, ExportLocaleSetting };
export { SUPPORTED_LOCALES, LOCALE_NAMES };

let appLocale: LocaleId = "en";

export function getSystemLocale(): LocaleId {
  const lang =
    process.env.LANG ?? process.env.LC_ALL ?? process.env.LC_MESSAGES ?? "";
  const code = lang.split(/[._-]/)[0]?.toLowerCase() ?? "";
  const match = SUPPORTED_LOCALES.find((l) => code === l || code.startsWith(l));
  return match ?? "en";
}

export function resolveAppLocale(setting: AppLocaleSetting): LocaleId {
  if (setting === "system") return getSystemLocale();
  return SUPPORTED_LOCALES.includes(setting as LocaleId)
    ? (setting as LocaleId)
    : "en";
}

export function resolveExportLocale(setting: ExportLocaleSetting): LocaleId {
  if (setting === "system") return getSystemLocale();
  return SUPPORTED_LOCALES.includes(setting as LocaleId)
    ? (setting as LocaleId)
    : "en";
}

export function setAppLocale(locale: LocaleId): void {
  appLocale = locale;
}

export function initI18n(
  appSetting: AppLocaleSetting,
  _exportSetting: ExportLocaleSetting
): void {
  appLocale = resolveAppLocale(appSetting);
  void _exportSetting;
}

export function t<K extends keyof AppTranslations>(key: K): AppTranslations[K] {
  const tr = getAppTranslations(appLocale);
  const val = tr[key];
  if (val === undefined) {
    return getAppTranslations("en")[key] as AppTranslations[K];
  }
  return val;
}

export function getAppT(locale: LocaleId): AppTranslations {
  return getAppTranslations(locale);
}

export function getExportT(locale: LocaleId): ExportTranslations & {
  formatChapter: (num: number, title?: string) => string;
} {
  const tr = getExportTranslations(locale);
  return {
    ...tr,
    formatChapter: (num: number, title?: string): string => {
      if (locale === "zh") {
        return title ? `第${num}章 - ${title}` : `第${num}章`;
      }
      if (locale === "ja") {
        return title ? `第${num}章 - ${title}` : `第${num}章`;
      }
      return title ? `${tr.chapter} ${num} - ${title}` : `${tr.chapter} ${num}`;
    },
  };
}
