import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { AppSettings, NewlinesHandling } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import type { OutputFormat } from "../menus/types.js";
import type {
  ChapterTitleStyleTxt,
  ChapterFileNameStyle,
  HtmlStyle,
} from "../converter/types.js";
import { SUPPORTED_LOCALES } from "../i18n/types.js";

const VALID_OUTPUT_FORMATS: OutputFormat[] = ["txt", "md", "json", "html"];
const VALID_CHAPTER_TITLE_STYLE: ChapterTitleStyleTxt[] = [
  "separated",
  "inline",
];
const VALID_NEWLINES: NewlinesHandling[] = ["keep", "one", "two"];
const VALID_CHAPTER_FILE_NAME_STYLE: ChapterFileNameStyle[] = [
  "same",
  "chapter",
  "custom",
];
const VALID_HTML_STYLE: HtmlStyle[] = ["none", "styled"];
const VALID_LOCALE_SETTINGS = ["system", ...SUPPORTED_LOCALES];

export interface SettingsCorrection {
  key: string;
  reason: string;
  defaultValue: string;
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function normalizeDefaultFormats(
  raw: unknown,
  legacySingle: string | undefined
): {
  value: AppSettings["defaultFormats"];
  corrected: boolean;
  reason?: string;
} {
  const fromArray = Array.isArray(raw)
    ? (raw as string[]).filter((f): f is OutputFormat =>
        VALID_OUTPUT_FORMATS.includes(f as OutputFormat)
      )
    : [];
  if (fromArray.length > 0) {
    const invalid = Array.isArray(raw)
      ? (raw as string[]).filter(
          (f) => !VALID_OUTPUT_FORMATS.includes(f as OutputFormat)
        )
      : [];
    return {
      value: fromArray,
      corrected: invalid.length > 0,
      reason:
        invalid.length > 0
          ? `Invalid format(s) removed: ${invalid.join(", ")}`
          : undefined,
    };
  }
  if (
    typeof legacySingle === "string" &&
    VALID_OUTPUT_FORMATS.includes(legacySingle as OutputFormat)
  ) {
    return { value: [legacySingle as OutputFormat], corrected: false };
  }
  return {
    value: [...DEFAULT_SETTINGS.defaultFormats],
    corrected: true,
    reason: "Missing or invalid defaultFormats",
  };
}

function writeCorrectionsLog(corrections: SettingsCorrection[]): void {
  if (corrections.length === 0) return;
  try {
    const logPath = path.join(os.tmpdir(), "ebook-x-settings-corrections.log");
    const timestamp = new Date().toISOString();
    const lines = [
      "",
      `[${timestamp}] Settings loaded with corrections:`,
      ...corrections.map(
        (c) => `  - ${c.key}: ${c.reason} → default: ${c.defaultValue}`
      ),
      "",
    ];
    fs.appendFileSync(logPath, lines.join("\n"), "utf-8");
  } catch {
    // ignore write errors
  }
}

export function validateAndNormalizeSettings(
  parsed: Partial<AppSettings> & {
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
  }
): AppSettings {
  const def = DEFAULT_SETTINGS;
  const corrections: SettingsCorrection[] = [];

  const result: AppSettings = {
    outputPath: def.outputPath,
    defaultFormats: def.defaultFormats,
    appLocale: def.appLocale,
    exportLocale: def.exportLocale,
    cliThemeId: def.cliThemeId,
    addChapterTitles: def.addChapterTitles,
    chapterTitleStyleTxt: def.chapterTitleStyleTxt,
    emDashToHyphen: def.emDashToHyphen,
    sanitizeWhitespace: def.sanitizeWhitespace,
    newlinesHandling: def.newlinesHandling,
    chapterFileNameStyle: def.chapterFileNameStyle,
    chapterFileNameCustomPrefix: def.chapterFileNameCustomPrefix,
    formats: {
      md: { ...def.formats.md },
      html: { ...def.formats.html },
      json: { ...def.formats.json },
    },
  };

  if (isString(parsed.outputPath)) {
    result.outputPath = parsed.outputPath;
  } else if (parsed.outputPath !== undefined) {
    corrections.push({
      key: "outputPath",
      reason: "Must be a string",
      defaultValue: JSON.stringify(def.outputPath),
    });
  }

  const fmtResult = normalizeDefaultFormats(
    parsed.defaultFormats,
    parsed.defaultFormat
  );
  result.defaultFormats = fmtResult.value;
  if (fmtResult.corrected && fmtResult.reason) {
    corrections.push({
      key: "defaultFormats",
      reason: fmtResult.reason,
      defaultValue: JSON.stringify(def.defaultFormats),
    });
  }

  if (
    isString(parsed.appLocale) &&
    VALID_LOCALE_SETTINGS.includes(parsed.appLocale)
  ) {
    result.appLocale = parsed.appLocale as AppSettings["appLocale"];
  } else if (parsed.appLocale !== undefined) {
    corrections.push({
      key: "appLocale",
      reason: `Must be one of: ${VALID_LOCALE_SETTINGS.join(", ")}`,
      defaultValue: def.appLocale,
    });
  }

  if (
    isString(parsed.exportLocale) &&
    VALID_LOCALE_SETTINGS.includes(parsed.exportLocale)
  ) {
    result.exportLocale = parsed.exportLocale as AppSettings["exportLocale"];
  } else if (parsed.exportLocale !== undefined) {
    corrections.push({
      key: "exportLocale",
      reason: `Must be one of: ${VALID_LOCALE_SETTINGS.join(", ")}`,
      defaultValue: def.exportLocale,
    });
  }

  if (isString(parsed.cliThemeId) && parsed.cliThemeId.trim()) {
    result.cliThemeId = parsed.cliThemeId.trim();
  } else if (parsed.cliThemeId !== undefined) {
    corrections.push({
      key: "cliThemeId",
      reason: "Must be a non-empty string",
      defaultValue: JSON.stringify(def.cliThemeId),
    });
  }

  if (isBoolean(parsed.addChapterTitles)) {
    result.addChapterTitles = parsed.addChapterTitles;
  } else if (parsed.addChapterTitles !== undefined) {
    corrections.push({
      key: "addChapterTitles",
      reason: "Must be a boolean",
      defaultValue: String(def.addChapterTitles),
    });
  }

  if (
    VALID_CHAPTER_TITLE_STYLE.includes(
      parsed.chapterTitleStyleTxt as ChapterTitleStyleTxt
    )
  ) {
    result.chapterTitleStyleTxt =
      parsed.chapterTitleStyleTxt as ChapterTitleStyleTxt;
  } else if (parsed.chapterTitleStyleTxt !== undefined) {
    corrections.push({
      key: "chapterTitleStyleTxt",
      reason: `Must be one of: ${VALID_CHAPTER_TITLE_STYLE.join(", ")}`,
      defaultValue: def.chapterTitleStyleTxt,
    });
  }

  if (isBoolean(parsed.emDashToHyphen)) {
    result.emDashToHyphen = parsed.emDashToHyphen;
  } else if (parsed.emDashToHyphen !== undefined) {
    corrections.push({
      key: "emDashToHyphen",
      reason: "Must be a boolean",
      defaultValue: String(def.emDashToHyphen),
    });
  }

  if (isBoolean(parsed.sanitizeWhitespace)) {
    result.sanitizeWhitespace = parsed.sanitizeWhitespace;
  } else if (parsed.sanitizeWhitespace !== undefined) {
    corrections.push({
      key: "sanitizeWhitespace",
      reason: "Must be a boolean",
      defaultValue: String(def.sanitizeWhitespace),
    });
  }

  if (VALID_NEWLINES.includes(parsed.newlinesHandling as NewlinesHandling)) {
    result.newlinesHandling = parsed.newlinesHandling as NewlinesHandling;
  } else if (parsed.newlinesHandling !== undefined) {
    corrections.push({
      key: "newlinesHandling",
      reason: `Must be one of: ${VALID_NEWLINES.join(", ")}`,
      defaultValue: def.newlinesHandling,
    });
  }

  if (
    VALID_CHAPTER_FILE_NAME_STYLE.includes(
      parsed.chapterFileNameStyle as ChapterFileNameStyle
    )
  ) {
    result.chapterFileNameStyle =
      parsed.chapterFileNameStyle as ChapterFileNameStyle;
  } else if (parsed.chapterFileNameStyle !== undefined) {
    corrections.push({
      key: "chapterFileNameStyle",
      reason: `Must be one of: ${VALID_CHAPTER_FILE_NAME_STYLE.join(", ")}`,
      defaultValue: def.chapterFileNameStyle,
    });
  }

  if (isString(parsed.chapterFileNameCustomPrefix)) {
    result.chapterFileNameCustomPrefix = parsed.chapterFileNameCustomPrefix;
  } else if (parsed.chapterFileNameCustomPrefix !== undefined) {
    corrections.push({
      key: "chapterFileNameCustomPrefix",
      reason: "Must be a string",
      defaultValue: JSON.stringify(def.chapterFileNameCustomPrefix),
    });
  }

  const legacy = {
    splitChapters: parsed.splitChapters,
    keepToc: parsed.keepToc,
    mdTocForChapters: parsed.mdTocForChapters,
    indexTocForChapters: parsed.indexTocForChapters,
    addBackLinkToChapters: parsed.addBackLinkToChapters,
    includeImages: parsed.includeImages,
  };
  const fm = parsed.formats;
  if (fm && typeof fm === "object") {
    if (fm.md && typeof fm.md === "object") {
      if (isBoolean(fm.md.splitChapters))
        result.formats.md.splitChapters = fm.md.splitChapters;
      else if (fm.md.splitChapters !== undefined)
        corrections.push({
          key: "formats.md.splitChapters",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.splitChapters),
        });
      if (isBoolean(fm.md.keepToc)) result.formats.md.keepToc = fm.md.keepToc;
      else if (fm.md.keepToc !== undefined)
        corrections.push({
          key: "formats.md.keepToc",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.keepToc),
        });
      if (isBoolean(fm.md.tocInChaptersFile))
        result.formats.md.tocInChaptersFile = fm.md.tocInChaptersFile;
      else if (fm.md.tocInChaptersFile !== undefined)
        corrections.push({
          key: "formats.md.tocInChaptersFile",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.tocInChaptersFile),
        });
      if (isBoolean(fm.md.indexWithToc))
        result.formats.md.indexWithToc = fm.md.indexWithToc;
      else if (fm.md.indexWithToc !== undefined)
        corrections.push({
          key: "formats.md.indexWithToc",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.indexWithToc),
        });
      if (isBoolean(fm.md.addBackLink))
        result.formats.md.addBackLink = fm.md.addBackLink;
      else if (fm.md.addBackLink !== undefined)
        corrections.push({
          key: "formats.md.addBackLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.addBackLink),
        });
      if (isBoolean(fm.md.addNextLink))
        result.formats.md.addNextLink = fm.md.addNextLink;
      else if (fm.md.addNextLink !== undefined)
        corrections.push({
          key: "formats.md.addNextLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.addNextLink),
        });
      if (isBoolean(fm.md.addPrevLink))
        result.formats.md.addPrevLink = fm.md.addPrevLink;
      else if (fm.md.addPrevLink !== undefined)
        corrections.push({
          key: "formats.md.addPrevLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.addPrevLink),
        });
      if (isBoolean(fm.md.includeImages))
        result.formats.md.includeImages = fm.md.includeImages;
      else if (fm.md.includeImages !== undefined)
        corrections.push({
          key: "formats.md.includeImages",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.md.includeImages),
        });
    }

    if (fm.html && typeof fm.html === "object") {
      if (isBoolean(fm.html.splitChapters))
        result.formats.html.splitChapters = fm.html.splitChapters;
      else if (fm.html.splitChapters !== undefined)
        corrections.push({
          key: "formats.html.splitChapters",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.splitChapters),
        });
      if (isBoolean(fm.html.keepToc))
        result.formats.html.keepToc = fm.html.keepToc;
      else if (fm.html.keepToc !== undefined)
        corrections.push({
          key: "formats.html.keepToc",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.keepToc),
        });
      if (isBoolean(fm.html.tocInChaptersFile))
        result.formats.html.tocInChaptersFile = fm.html.tocInChaptersFile;
      else if (fm.html.tocInChaptersFile !== undefined)
        corrections.push({
          key: "formats.html.tocInChaptersFile",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.tocInChaptersFile),
        });
      if (isBoolean(fm.html.indexWithToc))
        result.formats.html.indexWithToc = fm.html.indexWithToc;
      else if (fm.html.indexWithToc !== undefined)
        corrections.push({
          key: "formats.html.indexWithToc",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.indexWithToc),
        });
      if (isBoolean(fm.html.addBackLink))
        result.formats.html.addBackLink = fm.html.addBackLink;
      else if (fm.html.addBackLink !== undefined)
        corrections.push({
          key: "formats.html.addBackLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.addBackLink),
        });
      if (isBoolean(fm.html.addNextLink))
        result.formats.html.addNextLink = fm.html.addNextLink;
      else if (fm.html.addNextLink !== undefined)
        corrections.push({
          key: "formats.html.addNextLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.addNextLink),
        });
      if (isBoolean(fm.html.addPrevLink))
        result.formats.html.addPrevLink = fm.html.addPrevLink;
      else if (fm.html.addPrevLink !== undefined)
        corrections.push({
          key: "formats.html.addPrevLink",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.addPrevLink),
        });
      if (isBoolean(fm.html.includeImages))
        result.formats.html.includeImages = fm.html.includeImages;
      else if (fm.html.includeImages !== undefined)
        corrections.push({
          key: "formats.html.includeImages",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.html.includeImages),
        });
      if (VALID_HTML_STYLE.includes(fm.html.style as HtmlStyle)) {
        result.formats.html.style = fm.html.style as HtmlStyle;
      } else if (fm.html.style !== undefined) {
        corrections.push({
          key: "formats.html.style",
          reason: `Must be one of: ${VALID_HTML_STYLE.join(", ")}`,
          defaultValue: def.formats.html.style,
        });
      }
      if (isString(fm.html.htmlStyleId) && fm.html.htmlStyleId.trim()) {
        result.formats.html.htmlStyleId = fm.html.htmlStyleId.trim();
      } else if (fm.html.htmlStyleId !== undefined) {
        corrections.push({
          key: "formats.html.htmlStyleId",
          reason: "Must be a non-empty string",
          defaultValue: JSON.stringify(def.formats.html.htmlStyleId),
        });
      }
    }

    if (fm.json && typeof fm.json === "object") {
      if (isBoolean(fm.json.splitChapters))
        result.formats.json.splitChapters = fm.json.splitChapters;
      else if (fm.json.splitChapters !== undefined)
        corrections.push({
          key: "formats.json.splitChapters",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.json.splitChapters),
        });
      if (isBoolean(fm.json.includeImages))
        result.formats.json.includeImages = fm.json.includeImages;
      else if (fm.json.includeImages !== undefined)
        corrections.push({
          key: "formats.json.includeImages",
          reason: "Must be a boolean",
          defaultValue: String(def.formats.json.includeImages),
        });
    }
  } else if (
    legacy.splitChapters !== undefined ||
    legacy.keepToc !== undefined ||
    legacy.mdTocForChapters !== undefined ||
    legacy.indexTocForChapters !== undefined ||
    legacy.addBackLinkToChapters !== undefined ||
    legacy.includeImages !== undefined
  ) {
    if (isBoolean(legacy.splitChapters)) {
      result.formats.md.splitChapters = legacy.splitChapters;
      result.formats.html.splitChapters = legacy.splitChapters;
      result.formats.json.splitChapters = legacy.splitChapters;
    }
    if (isBoolean(legacy.keepToc)) {
      result.formats.md.keepToc = legacy.keepToc;
      result.formats.html.keepToc = legacy.keepToc;
    }
    if (isBoolean(legacy.mdTocForChapters)) {
      result.formats.md.tocInChaptersFile = legacy.mdTocForChapters;
      result.formats.html.tocInChaptersFile = legacy.mdTocForChapters;
    }
    if (isBoolean(legacy.indexTocForChapters)) {
      result.formats.md.indexWithToc = legacy.indexTocForChapters;
      result.formats.html.indexWithToc = legacy.indexTocForChapters;
    }
    if (isBoolean(legacy.addBackLinkToChapters)) {
      result.formats.md.addBackLink = legacy.addBackLinkToChapters;
      result.formats.html.addBackLink = legacy.addBackLinkToChapters;
    }
    if (isBoolean(legacy.includeImages)) {
      result.formats.md.includeImages = legacy.includeImages;
      result.formats.html.includeImages = legacy.includeImages;
      result.formats.json.includeImages = legacy.includeImages;
    }
  }

  if (parsed.htmlUseOriginalStyle !== undefined) {
    result.formats.html.style = parsed.htmlUseOriginalStyle ? "none" : "styled";
  }

  const correctedKeys = new Set(corrections.map((c) => c.key));
  if (
    !correctedKeys.has("formats.html.htmlStyleId") &&
    (typeof result.formats.html.htmlStyleId !== "string" ||
      !result.formats.html.htmlStyleId.trim())
  ) {
    result.formats.html.htmlStyleId = def.formats.html.htmlStyleId;
    corrections.push({
      key: "formats.html.htmlStyleId",
      reason: "Missing or empty (migrated from old settings)",
      defaultValue: JSON.stringify(def.formats.html.htmlStyleId),
    });
  }
  if (
    !correctedKeys.has("formats.html.style") &&
    result.formats.html.style !== "none" &&
    result.formats.html.style !== "styled"
  ) {
    result.formats.html.style = "styled";
    corrections.push({
      key: "formats.html.style",
      reason: "Invalid value (migrated from old settings)",
      defaultValue: def.formats.html.style,
    });
  }

  writeCorrectionsLog(corrections);
  return result;
}
