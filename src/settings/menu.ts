import type { AppSettings } from "./types.js";
import { DEFAULT_SETTINGS, formatHtmlStyleLabel } from "./types.js";
import { promptSelectDirectory } from "../file-explorer/directory-picker.js";
import { promptSettingsList } from "./settings-list-prompt.js";
import { promptOutputFormatsMulti } from "../menus/format-multi-select.js";
import { promptThemeMenu } from "./theme-menu.js";
import {
  promptManageHtmlStyles,
  promptChooseHtmlStyle,
} from "./html-style-menu.js";
import {
  getBuiltInHtmlStyle,
  loadHtmlStyle,
  isBuiltInHtmlStyleId,
} from "../html-styles/index.js";
import { BUILT_IN_HTML_STYLE_ID } from "../html-styles/types.js";
import { clearScreen } from "../menus/utils.js";
import path from "node:path";
import process from "node:process";
import {
  resolveTheme,
  setCurrentTheme,
  getDefaultTheme,
  DEFAULT_THEMES,
  isBuiltInThemeId,
  loadCustomTheme,
} from "../themes/index.js";
import type { BuiltInThemeId } from "../themes/types.js";
import { t, initI18n } from "../i18n/index.js";
import { LOCALE_NAMES } from "../i18n/types.js";
import {
  promptAppLanguageMenu,
  promptExportLanguageMenu,
} from "./language-menu.js";

function defaultFormatsLabel(formats: AppSettings["defaultFormats"]): string {
  if (formats.length === 0) return t("none");
  return formats.join(", ");
}

export type SettingKey =
  | "outputPath"
  | "defaultFormats"
  | "theme"
  | "chapterFileNameStyle"
  | "chapterFileNameCustomPrefix"
  | "addChapterTitles"
  | "chapterTitleStyleTxt"
  | "emDashToHyphen"
  | "sanitizeWhitespace"
  | "newlinesHandling"
  | "md_splitChapters"
  | "md_keepToc"
  | "md_tocInChaptersFile"
  | "md_indexWithToc"
  | "md_addBackLink"
  | "md_addNextLink"
  | "md_addPrevLink"
  | "md_includeImages"
  | "html_splitChapters"
  | "html_keepToc"
  | "html_tocInChaptersFile"
  | "html_indexWithToc"
  | "html_addBackLink"
  | "html_addNextLink"
  | "html_addPrevLink"
  | "html_includeImages"
  | "html_style"
  | "html_style_theme"
  | "html_styles"
  | "json_splitChapters"
  | "json_includeImages"
  | "app_language"
  | "export_language";

function formatOutputPath(s: AppSettings): string {
  if (!s.outputPath.trim()) return t("default_output");
  return s.outputPath;
}

function getThemeLabel(settings: AppSettings): string {
  const id = settings.cliThemeId;
  if (isBuiltInThemeId(id)) {
    return DEFAULT_THEMES[id as BuiltInThemeId].name;
  }
  const custom = loadCustomTheme(id);
  return custom?.name ?? id;
}

function getHtmlStyleLabel(settings: AppSettings): string {
  const id = settings.formats.html.htmlStyleId ?? BUILT_IN_HTML_STYLE_ID;
  if (isBuiltInHtmlStyleId(id)) {
    return getBuiltInHtmlStyle(id).name;
  }
  const custom = loadHtmlStyle(id);
  return custom?.name ?? id;
}

function getLocaleDisplay(setting: string): string {
  if (setting === "system") return t("language_system");
  return LOCALE_NAMES[setting as keyof typeof LOCALE_NAMES] ?? setting;
}

function formatLabel(s: AppSettings): Record<SettingKey, string> {
  const f = s.formats;
  return {
    outputPath: `${t("output_path")}: ${formatOutputPath(s)}`,
    defaultFormats: `${t("default_formats")}: ${defaultFormatsLabel(s.defaultFormats)}`,
    theme: `${t("theme")}: ${getThemeLabel(s)}`,
    html_styles: t("html_styles"),
    app_language: `${t("app_language")}: ${getLocaleDisplay(s.appLocale)}`,
    export_language: `${t("export_language")}: ${getLocaleDisplay(s.exportLocale)}`,
    chapterFileNameStyle: `Chapter name: ${s.chapterFileNameStyle === "same" ? "Same as output" : s.chapterFileNameStyle === "chapter" ? "Chapter" : "Custom"}`,
    chapterFileNameCustomPrefix: `${t("chapter_prefix")}: ${s.chapterFileNameCustomPrefix || t("none")}`,
    addChapterTitles: `Chapter titles: ${s.addChapterTitles ? "Yes" : "No"}`,
    chapterTitleStyleTxt: `Title style (.txt): ${s.chapterTitleStyleTxt === "separated" ? "Separated" : "Inline"}`,
    emDashToHyphen: `Em dash → hyphen: ${s.emDashToHyphen ? "Yes" : "No"}`,
    sanitizeWhitespace: `Sanitize whitespace: ${s.sanitizeWhitespace ? "Yes" : "No"}`,
    newlinesHandling: `Newlines: ${s.newlinesHandling === "keep" ? "Keep" : s.newlinesHandling === "one" ? "One" : "Two"}`,
    md_splitChapters: `Split chapters: ${f.md.splitChapters ? "Yes" : "No"}`,
    md_keepToc: `Keep TOC: ${f.md.keepToc ? "Yes" : "No"}`,
    md_tocInChaptersFile: `TOC in file: ${f.md.tocInChaptersFile ? "Yes" : "No"}`,
    md_indexWithToc: `Index with TOC: ${f.md.indexWithToc ? "Yes" : "No"}`,
    md_addBackLink: `TOC link: ${f.md.addBackLink ? "Yes" : "No"}`,
    md_addNextLink: `Next link: ${f.md.addNextLink ? "Yes" : "No"}`,
    md_addPrevLink: `Previous link: ${f.md.addPrevLink ? "Yes" : "No"}`,
    md_includeImages: `Include images: ${f.md.includeImages ? "Yes" : "No"}`,
    html_splitChapters: `Split chapters: ${f.html.splitChapters ? "Yes" : "No"}`,
    html_keepToc: `Keep TOC: ${f.html.keepToc ? "Yes" : "No"}`,
    html_tocInChaptersFile: `TOC in file: ${f.html.tocInChaptersFile ? "Yes" : "No"}`,
    html_indexWithToc: `Index with TOC: ${f.html.indexWithToc ? "Yes" : "No"}`,
    html_addBackLink: `TOC link: ${f.html.addBackLink ? "Yes" : "No"}`,
    html_addNextLink: `Next link: ${f.html.addNextLink ? "Yes" : "No"}`,
    html_addPrevLink: `Previous link: ${f.html.addPrevLink ? "Yes" : "No"}`,
    html_includeImages: `Include images: ${f.html.includeImages ? "Yes" : "No"}`,
    html_style: `HTML style: ${formatHtmlStyleLabel(f.html.style)}`,
    html_style_theme: `HTML style theme: ${getHtmlStyleLabel(s)}`,
    json_splitChapters: `Split chapters: ${f.json.splitChapters ? "Yes" : "No"}`,
    json_includeImages: `Include images: ${f.json.includeImages ? "Yes" : "No"}`,
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
    case "md_splitChapters":
    case "html_splitChapters":
    case "json_splitChapters":
      return "On: each chapter is a separate file under chapters/; main file is an index. Off: whole book in one file.";
    case "md_keepToc":
    case "html_keepToc":
      return "On: table-of-contents structure from the EPUB is kept in the extracted content. Off: TOC is not specially preserved.";
    case "md_tocInChaptersFile":
    case "html_tocInChaptersFile":
      return "On: a table-of-contents block (links to chapter headings) is added at the top of single-file output. Off: no TOC block.";
    case "md_indexWithToc":
    case "html_indexWithToc":
      return "On: when split chapters is on, the main file is an index with links to each chapter file. Off: no index file for chapter list.";
    case "md_addBackLink":
    case "html_addBackLink":
      return "On: each chapter file gets a link back to the TOC/index when index with TOC is used. Off: no TOC link.";
    case "md_addNextLink":
    case "html_addNextLink":
      return "On: each chapter file gets a link to the next chapter. Off: no next link.";
    case "md_addPrevLink":
    case "html_addPrevLink":
      return "On: each chapter file gets a link to the previous chapter. Off: no previous link.";
    case "md_includeImages":
    case "html_includeImages":
      return "On: images are extracted to files. Off: images are skipped.";
    case "json_includeImages":
      return "On: images are extracted to files; main JSON has an image index and ${{img_id}} placeholders. Off: no images in JSON.";
    case "html_style":
      return settings.formats.html.style === "none"
        ? "Pure HTML: no CSS; raw HTML only. Fast and minimal."
        : "Styled: apply the selected HTML style (titles, chapters, fonts) when creating HTML output.";
    case "html_style_theme":
      return "Choose which HTML style to use for styled HTML output. Add, edit, or delete styles in App Settings.";
    case "theme":
      return "CLI appearance: colors and frame style for menus and lists. Choose a built-in theme or create and edit custom themes.";
    case "html_styles":
      return "Add, edit, or delete custom HTML styles. Styles define CSS classes for body, chapter title, TOC, etc. Choose which style to use in HTML Format Settings.";
    case "app_language":
      return "Language for menus, hints, and messages. System uses your OS locale.";
    case "export_language":
      return "Language for text in converted files: table of contents, chapter labels, next/previous links.";
    case "__done__":
      return "Save current settings and return to the main menu.";
    case "__sep_app__":
      return "Appearance of the app: CLI theme (colors and frame style).";
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
  const f = settings.formats;
  return [
    { name: t("sep_app"), value: "__sep_app__", disabled: true },
    { name: labels.theme, value: "theme" },
    { name: labels.html_styles, value: "html_styles" },
    { name: labels.app_language, value: "app_language" },
    { name: labels.export_language, value: "export_language" },
    { name: t("sep_general"), value: "__sep__", disabled: true },
    { name: labels.outputPath, value: "outputPath" },
    { name: labels.defaultFormats, value: "defaultFormats" },
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
    { name: "——— TXT output only ———", value: "__sep2__", disabled: true },
    { name: labels.addChapterTitles, value: "addChapterTitles" },
    { name: labels.chapterTitleStyleTxt, value: "chapterTitleStyleTxt" },
    { name: "——— MD output only ———", value: "__sep3__", disabled: true },
    { name: labels.md_splitChapters, value: "md_splitChapters" },
    { name: labels.md_keepToc, value: "md_keepToc" },
    { name: labels.md_includeImages, value: "md_includeImages" },
    { name: labels.md_tocInChaptersFile, value: "md_tocInChaptersFile" },
    { name: labels.md_indexWithToc, value: "md_indexWithToc" },
    ...(f.md.splitChapters
      ? [
          ...(f.md.indexWithToc
            ? [{ name: labels.md_addBackLink, value: "md_addBackLink" }]
            : []),
          { name: labels.md_addNextLink, value: "md_addNextLink" },
          { name: labels.md_addPrevLink, value: "md_addPrevLink" },
        ]
      : []),
    { name: "——— HTML output only ———", value: "__sep4__", disabled: true },
    { name: labels.html_splitChapters, value: "html_splitChapters" },
    { name: labels.html_keepToc, value: "html_keepToc" },
    { name: labels.html_includeImages, value: "html_includeImages" },
    { name: labels.html_tocInChaptersFile, value: "html_tocInChaptersFile" },
    { name: labels.html_indexWithToc, value: "html_indexWithToc" },
    ...(f.html.splitChapters
      ? [
          ...(f.html.indexWithToc
            ? [{ name: labels.html_addBackLink, value: "html_addBackLink" }]
            : []),
          { name: labels.html_addNextLink, value: "html_addNextLink" },
          { name: labels.html_addPrevLink, value: "html_addPrevLink" },
        ]
      : []),
    { name: labels.html_style, value: "html_style" },
    ...(f.html.style === "styled"
      ? [{ name: labels.html_style_theme, value: "html_style_theme" }]
      : []),
    { name: "——— JSON output only ———", value: "__sep5__", disabled: true },
    { name: labels.json_splitChapters, value: "json_splitChapters" },
    { name: labels.json_includeImages, value: "json_includeImages" },
    { name: t("done"), value: "__done__" },
  ];
}

export async function promptSettingsMenu(
  currentSettings: AppSettings
): Promise<AppSettings | null> {
  const settings: AppSettings = {
    ...currentSettings,
    formats: {
      md: { ...currentSettings.formats.md },
      html: { ...currentSettings.formats.html },
      json: { ...currentSettings.formats.json },
    },
  };

  for (;;) {
    clearScreen();
    const action = await promptSettingsList(
      settings,
      () => buildChoices(settings),
      currentSettings
    );

    if (action.type === "cancel") return null;
    if (action.type === "done") return settings;
    if (action.type === "restoreDefaults") {
      Object.assign(settings, {
        ...DEFAULT_SETTINGS,
        formats: {
          md: { ...DEFAULT_SETTINGS.formats.md },
          html: { ...DEFAULT_SETTINGS.formats.html },
          json: { ...DEFAULT_SETTINGS.formats.json },
        },
      });
      setCurrentTheme(resolveTheme(settings.cliThemeId));
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
        settings.defaultFormats = [...formats];
      continue;
    }
    if (action.type === "openTheme") {
      const themeAction = await promptThemeMenu(settings);
      if (themeAction.type === "chosen" || themeAction.type === "saved") {
        settings.cliThemeId = themeAction.cliThemeId;
        setCurrentTheme(resolveTheme(themeAction.cliThemeId));
      } else if (themeAction.type === "deleted") {
        settings.cliThemeId = "default";
        setCurrentTheme(getDefaultTheme("default"));
      }
      continue;
    }
    if (action.type === "openAppLanguage") {
      const next = await promptAppLanguageMenu(settings.appLocale);
      if (next !== null) {
        settings.appLocale = next;
        initI18n(settings.appLocale, settings.exportLocale);
      }
      continue;
    }
    if (action.type === "openExportLanguage") {
      const next = await promptExportLanguageMenu(settings.exportLocale);
      if (next !== null) {
        settings.exportLocale = next;
        initI18n(settings.appLocale, settings.exportLocale);
      }
      continue;
    }
    if (action.type === "openManageHtmlStyles") {
      const result = await promptManageHtmlStyles(settings);
      if (result.type === "deletedCurrent") {
        settings.formats.html.htmlStyleId = result.newId;
      }
      continue;
    }
    if (action.type === "openChooseHtmlStyle") {
      const id = await promptChooseHtmlStyle(
        settings.formats.html.htmlStyleId ?? BUILT_IN_HTML_STYLE_ID
      );
      if (id !== null) settings.formats.html.htmlStyleId = id;
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
