import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { AppSettings } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";

function getConfigDir(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    const base =
      process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    return path.join(base, "epub-x");
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "epub-x");
  }
  const base = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  return path.join(base, "epub-x");
}

function getSettingsPath(): string {
  const configDir = getConfigDir();
  fs.mkdirSync(configDir, { recursive: true });
  return path.join(configDir, "settings.json");
}

export function loadSettings(): AppSettings {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const content = fs.readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content) as Partial<AppSettings> & {
      defaultFormat?: AppSettings["defaultFormats"][number];
      htmlUseOriginalStyle?: boolean;
    };
    const result: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
    if (parsed.htmlUseOriginalStyle !== undefined && !("htmlStyle" in parsed)) {
      result.htmlStyle = parsed.htmlUseOriginalStyle ? "none" : "custom";
    }
    if (
      !Array.isArray(result.defaultFormats) ||
      result.defaultFormats.length === 0
    ) {
      result.defaultFormats =
        typeof parsed.defaultFormat === "string"
          ? [parsed.defaultFormat]
          : DEFAULT_SETTINGS.defaultFormats;
    }
    return result;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  const settingsPath = getSettingsPath();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}
