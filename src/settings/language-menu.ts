import { SUPPORTED_LOCALES, LOCALE_NAMES } from "../i18n/types.js";
import type { AppLocaleSetting, ExportLocaleSetting } from "../i18n/types.js";
import { promptFramedSelect } from "../menus/framed-select.js";
import { t } from "../i18n/index.js";

const HINT = " ↑/↓ move  Enter select  Esc back";

const LOCALE_OPTIONS: { value: AppLocaleSetting; label: string }[] = [
  { value: "system", label: "" },
  ...SUPPORTED_LOCALES.map((id) => ({
    value: id as AppLocaleSetting,
    label: LOCALE_NAMES[id],
  })),
];

function getLocaleLabel(value: AppLocaleSetting): string {
  if (value === "system") return t("language_system");
  return LOCALE_NAMES[value as keyof typeof LOCALE_NAMES] ?? value;
}

export async function promptAppLanguageMenu(
  current: AppLocaleSetting
): Promise<AppLocaleSetting | null> {
  const choices = LOCALE_OPTIONS.map((o) => ({
    name: o.value === "system" ? getLocaleLabel("system") : o.label,
    value: o.value,
  }));
  const idx = choices.findIndex((c) => c.value === current);
  const value = await promptFramedSelect(
    t("app_language"),
    choices,
    HINT,
    idx >= 0 ? idx : 0
  );
  return value as AppLocaleSetting | null;
}

export async function promptExportLanguageMenu(
  current: ExportLocaleSetting
): Promise<ExportLocaleSetting | null> {
  const choices = LOCALE_OPTIONS.map((o) => ({
    name: o.value === "system" ? getLocaleLabel("system") : o.label,
    value: o.value,
  }));
  const idx = choices.findIndex((c) => c.value === current);
  const value = await promptFramedSelect(
    t("export_language"),
    choices,
    HINT,
    idx >= 0 ? idx : 0
  );
  return value as ExportLocaleSetting | null;
}
