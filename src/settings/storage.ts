import fs from "node:fs";
import path from "node:path";
import type { AppSettings } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { getConfigDir } from "../utils/config-dir.js";
import { validateAndNormalizeSettings } from "./validate-settings.js";

function getSettingsPath(): string {
  const configDir = getConfigDir();
  fs.mkdirSync(configDir, { recursive: true });
  return path.join(configDir, "settings.json");
}

type LegacyParsed = Partial<AppSettings> & {
  defaultFormat?: AppSettings["defaultFormats"][number];
  htmlUseOriginalStyle?: boolean;
  splitChapters?: boolean;
  keepToc?: boolean;
  mdTocForChapters?: boolean;
  indexTocForChapters?: boolean;
  addBackLinkToChapters?: boolean;
  includeImages?: boolean;
  htmlStyle?: AppSettings["formats"]["html"]["style"];
  htmlStyleId?: string;
};

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = fs.readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content) as LegacyParsed;
    return validateAndNormalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath();
  const defaultFormats = Array.isArray(settings.defaultFormats)
    ? [...settings.defaultFormats]
    : [...DEFAULT_SETTINGS.defaultFormats];
  const payload: AppSettings = {
    ...settings,
    defaultFormats,
  };
  const content = JSON.stringify(payload, null, 2);
  const dir = path.dirname(settingsPath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(dir, ".settings.json.tmp");
  fs.writeFileSync(tmpPath, content, "utf-8");
  fs.renameSync(tmpPath, settingsPath);
}
