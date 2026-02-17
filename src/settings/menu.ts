import type { AppSettings } from "./types.js";
import { DEFAULT_SETTINGS } from "./types.js";
import { promptSelectDirectory } from "../file-explorer/directory-picker.js";
import { promptSettingsList } from "./settings-list-prompt.js";
import { clearScreen } from "../menus/utils.js";
import path from "node:path";
import process from "node:process";

export type SettingKey =
  | "outputPath"
  | "defaultFormat"
  | "restoreDefaults"
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
  | "addBackLinkToChapters";

function formatOutputPath(s: AppSettings): string {
  if (!s.outputPath.trim()) return "Default (./output)";
  return s.outputPath;
}

function formatLabel(s: AppSettings): Record<SettingKey, string> {
  return {
    outputPath: `Output path: ${formatOutputPath(s)}`,
    defaultFormat: `Default format: ${s.defaultFormat === "txt" ? "Plain text (.txt)" : "Markdown (.md)"}`,
    restoreDefaults: "Restore default settings",
    splitChapters: `Split chapters to separate files: ${s.splitChapters ? "Yes" : "No"}`,
    chapterFileNameStyle: `Chapter file name: ${s.chapterFileNameStyle === "same" ? "Same as output" : s.chapterFileNameStyle === "chapter" ? "Chapter" : "Custom"}`,
    chapterFileNameCustomPrefix: `Chapter file custom prefix: ${s.chapterFileNameCustomPrefix || "(none)"}`,
    addChapterTitles: `Add chapter titles: ${s.addChapterTitles ? "Yes" : "No"}`,
    chapterTitleStyleTxt: `Chapter title style (.txt): ${s.chapterTitleStyleTxt === "separated" ? "Separated lines" : "Inline"}`,
    emDashToHyphen: `Replace em dash with hyphen: ${s.emDashToHyphen ? "Yes" : "No"}`,
    sanitizeWhitespace: `Sanitize whitespace: ${s.sanitizeWhitespace ? "Yes" : "No"}`,
    newlinesHandling: `Multiple newlines: ${s.newlinesHandling === "keep" ? "Keep as is" : s.newlinesHandling === "one" ? "Join to one" : "Join to two"}`,
    keepToc: `Keep table of contents: ${s.keepToc ? "Yes" : "No"}`,
    includeImages: `Include images: ${s.includeImages ? "Yes" : "No"}`,
    mdTocForChapters: `Create TOC for MD files: ${s.mdTocForChapters ? "Yes" : "No"}`,
    indexTocForChapters: `Create index file with TOC for chapters: ${s.indexTocForChapters ? "Yes" : "No"}`,
    addBackLinkToChapters: `Add back link to chapters: ${s.addBackLinkToChapters ? "Yes" : "No"}`,
  };
}

export function buildChoices(
  settings: AppSettings
): { name: string; value: string; disabled?: boolean }[] {
  const labels = formatLabel(settings);
  return [
    { name: "——— General ———", value: "__sep__", disabled: true },
    { name: labels.outputPath, value: "outputPath" },
    { name: labels.defaultFormat, value: "defaultFormat" },
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
    { name: labels.restoreDefaults, value: "__restore__" },
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
