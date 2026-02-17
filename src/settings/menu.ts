import type { AppSettings } from "./types.js";
import { DEFAULT_SETTINGS, formatHtmlStyleLabel } from "./types.js";
import { promptSelectDirectory } from "../file-explorer/directory-picker.js";
import { promptSettingsList } from "./settings-list-prompt.js";
import { promptOutputFormatsMulti } from "../menus/format-multi-select.js";
import { clearScreen } from "../menus/utils.js";
import path from "node:path";
import process from "node:process";

function defaultFormatsLabel(formats: AppSettings["defaultFormats"]): string {
  if (formats.length === 0) return "(none)";
  return formats.join(", ");
}

export type SettingKey =
  | "outputPath"
  | "defaultFormats"
  | "splitChapters"
  | "chapterFileNameStyle"
  | "chapterFileNameCustomPrefix"
  | "addChapterTitles"
  | "chapterTitleStyleTxt"
  | "emDashToHyphen"
  | "sanitizeWhitespace"
  | "newlinesHandling"
  | "keepToc"
  | "includeImages"
  | "mdTocForChapters"
  | "indexTocForChapters"
  | "addBackLinkToChapters"
  | "htmlStyle";

function formatOutputPath(s: AppSettings): string {
  if (!s.outputPath.trim()) return "Default (./output)";
  return s.outputPath;
}

function formatLabel(s: AppSettings): Record<SettingKey, string> {
  return {
    outputPath: `Output path: ${formatOutputPath(s)}`,
    defaultFormats: `Default formats: ${defaultFormatsLabel(s.defaultFormats)}`,
    splitChapters: `Split chapters: ${s.splitChapters ? "Yes" : "No"}`,
    chapterFileNameStyle: `Chapter name: ${s.chapterFileNameStyle === "same" ? "Same as output" : s.chapterFileNameStyle === "chapter" ? "Chapter" : "Custom"}`,
    chapterFileNameCustomPrefix: `Chapter prefix: ${s.chapterFileNameCustomPrefix || "(none)"}`,
    addChapterTitles: `Chapter titles: ${s.addChapterTitles ? "Yes" : "No"}`,
    chapterTitleStyleTxt: `Title style (.txt): ${s.chapterTitleStyleTxt === "separated" ? "Separated" : "Inline"}`,
    emDashToHyphen: `Em dash → hyphen: ${s.emDashToHyphen ? "Yes" : "No"}`,
    sanitizeWhitespace: `Sanitize whitespace: ${s.sanitizeWhitespace ? "Yes" : "No"}`,
    newlinesHandling: `Newlines: ${s.newlinesHandling === "keep" ? "Keep" : s.newlinesHandling === "one" ? "One" : "Two"}`,
    keepToc: `Keep TOC: ${s.keepToc ? "Yes" : "No"}`,
    includeImages: `Include images: ${s.includeImages ? "Yes" : "No"}`,
    mdTocForChapters: `TOC in file: ${s.mdTocForChapters ? "Yes" : "No"}`,
    indexTocForChapters: `Index with TOC: ${s.indexTocForChapters ? "Yes" : "No"}`,
    addBackLinkToChapters: `Back link: ${s.addBackLinkToChapters ? "Yes" : "No"}`,
    htmlStyle: `HTML style: ${formatHtmlStyleLabel(s.htmlStyle)}`,
  };
}

export function getSettingDescription(
  value: string,
  settings: AppSettings
): string {
  switch (value) {
    case "outputPath":
      return "Folder where extracted books are saved. Default is ./output if empty.";
    case "defaultFormats":
      return "Formats offered when you add a book (e.g. TXT, MD, HTML, JSON). At least one is required.";
    case "splitChapters":
      return settings.splitChapters
        ? "On: each chapter is a separate file under chapters/; main file is an index. Applies to MD, HTML, JSON."
        : "Off: whole book in one file. Turn on to get one file per chapter plus an index.";
    case "chapterFileNameStyle":
      return settings.chapterFileNameStyle === "same"
        ? "Same as output: chapter files use the book name (e.g. book-chapter-1.md)."
        : settings.chapterFileNameStyle === "chapter"
          ? "Chapter: files named chapter-1, chapter-2, etc."
          : "Custom: use your own prefix for chapter file names (set in the next option).";
    case "chapterFileNameCustomPrefix":
      return "Prefix for chapter file names when Chapter name is Custom (e.g. 'ch' → ch1.md, ch2.md).";
    case "addChapterTitles":
      return settings.addChapterTitles
        ? "On: chapter number (and title if present) is added at the start of each chapter in TXT output."
        : "Off: no automatic chapter title line in TXT.";
    case "chapterTitleStyleTxt":
      return settings.chapterTitleStyleTxt === "separated"
        ? "Separated: chapter title on its own line(s), then a blank line, then the chapter body."
        : "Inline: chapter title and body on the same line.";
    case "emDashToHyphen":
      return settings.emDashToHyphen
        ? "On: em dashes (—) are converted to hyphens (-) in extracted text."
        : "Off: em dashes are left as-is.";
    case "sanitizeWhitespace":
      return settings.sanitizeWhitespace
        ? "On: multiple spaces and odd line breaks are normalized in extracted text."
        : "Off: whitespace from the source is preserved.";
    case "newlinesHandling":
      return settings.newlinesHandling === "keep"
        ? "Keep: paragraph breaks from the source are kept as-is."
        : settings.newlinesHandling === "one"
          ? "One: multiple consecutive newlines are collapsed to a single newline."
          : "Two: multiple newlines are collapsed to at most two (one blank line between paragraphs).";
    case "keepToc":
      return settings.keepToc
        ? "On: table-of-contents structure from the EPUB is kept in the extracted content where applicable."
        : "Off: TOC is not specially preserved.";
    case "includeImages":
      return settings.includeImages
        ? "On: images are extracted and inlined (MD/HTML) or embedded as base64 with {{img_id}} placeholders (JSON)."
        : "Off: images are skipped in extraction.";
    case "mdTocForChapters":
      return settings.mdTocForChapters
        ? "On: a table-of-contents block (links to chapter headings) is added at the top of MD/HTML single-file output."
        : "Off: no TOC block in the file.";
    case "indexTocForChapters":
      return settings.indexTocForChapters
        ? "On: when split chapters is on, the main file is an index with links to each chapter file (MD). HTML always gets an index when split."
        : "Off: no separate index file for chapter list (HTML still gets an index when split).";
    case "addBackLinkToChapters":
      return settings.addBackLinkToChapters
        ? "On: each chapter file gets a 'Back to index' link when index with TOC is used."
        : "Off: no back link in chapter files.";
    case "htmlStyle":
      return settings.htmlStyle === "none"
        ? "None: no CSS; raw HTML only. Fast and minimal."
        : settings.htmlStyle === "styled"
          ? "Styled: default CSS with sans-serif fonts and centered images. Good readability without customizing."
          : "Custom: use your saved theme (colors and fonts) for HTML output.";
    case "__done__":
      return "Save current settings and return to the main menu.";
    case "__sep__":
      return "General options: output folder, default formats, chapter splitting, and text cleanup.";
    case "__sep2__":
      return "Options that apply only when extracting to TXT.";
    case "__sep3__":
      return "Options that apply only when extracting to MD.";
    case "__sep4__":
      return "Options that apply only when extracting to HTML.";
    case "__sep5__":
      return "Options that apply only when extracting to JSON.";
    default:
      return "";
  }
}

export function buildChoices(
  settings: AppSettings
): { name: string; value: string; disabled?: boolean }[] {
  const labels = formatLabel(settings);
  return [
    { name: "——— General ———", value: "__sep__", disabled: true },
    { name: labels.outputPath, value: "outputPath" },
    { name: labels.defaultFormats, value: "defaultFormats" },
    { name: labels.splitChapters, value: "splitChapters" },
    { name: labels.chapterFileNameStyle, value: "chapterFileNameStyle" },
    ...(settings.chapterFileNameStyle === "custom"
      ? [
          {
            name: labels.chapterFileNameCustomPrefix,
            value: "chapterFileNameCustomPrefix",
          },
        ]
      : []),
    { name: labels.emDashToHyphen, value: "emDashToHyphen" },
    { name: labels.sanitizeWhitespace, value: "sanitizeWhitespace" },
    { name: labels.newlinesHandling, value: "newlinesHandling" },
    { name: labels.keepToc, value: "keepToc" },
    { name: "——— TXT output only ———", value: "__sep2__", disabled: true },
    { name: labels.addChapterTitles, value: "addChapterTitles" },
    { name: labels.chapterTitleStyleTxt, value: "chapterTitleStyleTxt" },
    { name: "——— MD output only ———", value: "__sep3__", disabled: true },
    { name: labels.includeImages, value: "includeImages" },
    { name: labels.mdTocForChapters, value: "mdTocForChapters" },
    { name: labels.indexTocForChapters, value: "indexTocForChapters" },
    ...(settings.indexTocForChapters
      ? [{ name: labels.addBackLinkToChapters, value: "addBackLinkToChapters" }]
      : []),
    { name: "——— HTML output only ———", value: "__sep4__", disabled: true },
    { name: labels.includeImages, value: "includeImages" },
    { name: labels.mdTocForChapters, value: "mdTocForChapters" },
    { name: labels.indexTocForChapters, value: "indexTocForChapters" },
    ...(settings.indexTocForChapters
      ? [{ name: labels.addBackLinkToChapters, value: "addBackLinkToChapters" }]
      : []),
    { name: labels.htmlStyle, value: "htmlStyle" },
    { name: "——— JSON output only ———", value: "__sep5__", disabled: true },
    { name: labels.includeImages, value: "includeImages" },
    { name: labels.splitChapters, value: "splitChapters" },
    { name: "Done", value: "__done__" },
  ];
}

export async function promptSettingsMenu(
  currentSettings: AppSettings
): Promise<AppSettings | null> {
  const settings = { ...currentSettings };

  for (;;) {
    clearScreen();
    const action = await promptSettingsList(settings, () =>
      buildChoices(settings)
    );

    if (action.type === "cancel") return null;
    if (action.type === "done") return settings;
    if (action.type === "restoreDefaults") {
      Object.assign(settings, { ...DEFAULT_SETTINGS });
      continue;
    }
    if (action.type === "openOutputPath") {
      const startDir = settings.outputPath.trim()
        ? path.resolve(settings.outputPath)
        : path.join(process.cwd(), "output");
      const dir = await promptSelectDirectory(startDir);
      if (dir !== null) settings.outputPath = dir;
      continue;
    }
    if (action.type === "openDefaultFormats") {
      const formats = await promptOutputFormatsMulti(settings.defaultFormats);
      if (formats !== null && formats.length > 0)
        settings.defaultFormats = formats;
      continue;
    }
    if (action.type === "openCustomPrefix") {
      const { input } = await import("@inquirer/prompts");
      const prefix = await input({
        message: "Chapter file custom prefix",
        default: settings.chapterFileNameCustomPrefix,
      });
      settings.chapterFileNameCustomPrefix = prefix.trim();
      continue;
    }
  }
}
