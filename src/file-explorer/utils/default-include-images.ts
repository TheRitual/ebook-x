import type { OutputFormat } from "../../menus/types.js";
import type { AppSettings } from "../../settings/types.js";

type FormatWithImages = "md" | "html" | "json";

function isFormatWithImages(f: OutputFormat): f is FormatWithImages {
  return f === "md" || f === "html" || f === "json";
}

export function getDefaultIncludeImages(
  settings: AppSettings,
  formats: OutputFormat[]
): boolean {
  for (const fmt of formats) {
    if (isFormatWithImages(fmt) && settings.formats[fmt].includeImages) {
      return true;
    }
  }
  return false;
}
