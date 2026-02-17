import path from "node:path";
import os from "node:os";

export function getConfigDir(): string {
  const home = os.homedir();
  if (process.platform === "win32") {
    const base =
      process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");
    return path.join(base, "ebook-x");
  }
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "ebook-x");
  }
  const base = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  return path.join(base, "ebook-x");
}

export function getThemesDir(): string {
  return path.join(getConfigDir(), "themes");
}

export function getHtmlStylesDir(): string {
  return path.join(getConfigDir(), "html-styles");
}
