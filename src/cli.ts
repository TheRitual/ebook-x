#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import {
  promptSelectEpubFiles,
  type SplitFilePickerState,
} from "./file-explorer/index.js";
import { promptViewSelectedFilesAndSettings } from "./file-explorer/view-selected-files-prompt.js";
import type { SelectedFile } from "./file-explorer/selected-file-types.js";
import {
  promptMainMenu,
  promptAfterFileSelection,
  promptSuccessScreen,
  promptFramedSelect,
  promptHowTo,
} from "./menus/index.js";
import { promptOutputFormatsMulti } from "./menus/format-multi-select.js";
import { clearScreen } from "./menus/utils.js";
import { convertEpub, resolveOutputDir } from "./converter/index.js";
import { loadSettings, saveSettings } from "./settings/storage.js";
import { promptSettingsMenu } from "./settings/menu.js";
import { initI18n, resolveExportLocale, t } from "./i18n/index.js";
import { setCurrentTheme, resolveTheme } from "./themes/index.js";
import type { AppSettings } from "./settings/types.js";
import type { OutputFormat } from "./menus/types.js";
import type { ConvertOptions } from "./converter/types.js";
import { exitNicely } from "./exit.js";

function isCancelOrExit(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "CancelPromptError" || err.name === "ExitPromptError")
  );
}

function settingsToConvertOptions(
  settings: AppSettings,
  format: "txt" | "md" | "json" | "html",
  perFile?: SelectedFile
): ConvertOptions {
  const opts: ConvertOptions = {
    chapterIndices: perFile?.chapterIndices ?? undefined,
    includeImages: false,
    addChapterTitles: settings.addChapterTitles,
    chapterTitleStyleTxt: settings.chapterTitleStyleTxt,
    emDashToHyphen: settings.emDashToHyphen,
    sanitizeWhitespace: settings.sanitizeWhitespace,
    newlinesHandling: settings.newlinesHandling,
    keepToc: false,
    mdTocForChapters: false,
    splitChapters: false,
    chapterFileNameStyle: settings.chapterFileNameStyle,
    chapterFileNameCustomPrefix: settings.chapterFileNameCustomPrefix,
    indexTocForChapters: false,
    addBackLinkToChapters: false,
    addNextLinkToChapters: false,
    addPrevLinkToChapters: false,
  };
  if (format === "md") {
    const fm = settings.formats.md;
    opts.includeImages = perFile?.includeImages ?? fm.includeImages;
    opts.keepToc = fm.keepToc;
    opts.mdTocForChapters = fm.tocInChaptersFile;
    opts.splitChapters = fm.splitChapters;
    opts.indexTocForChapters = fm.indexWithToc;
    opts.addBackLinkToChapters = fm.addBackLink;
    opts.addNextLinkToChapters = fm.addNextLink;
    opts.addPrevLinkToChapters = fm.addPrevLink;
  } else if (format === "html") {
    const fm = settings.formats.html;
    opts.includeImages = perFile?.includeImages ?? fm.includeImages;
    opts.keepToc = fm.keepToc;
    opts.mdTocForChapters = fm.tocInChaptersFile;
    opts.splitChapters = fm.splitChapters;
    opts.indexTocForChapters = fm.indexWithToc;
    opts.addBackLinkToChapters = fm.addBackLink;
    opts.addNextLinkToChapters = fm.addNextLink;
    opts.addPrevLinkToChapters = fm.addPrevLink;
    opts.htmlStyle = fm.style;
    opts.htmlStyleId = fm.htmlStyleId;
  } else if (format === "json") {
    const fm = settings.formats.json;
    opts.includeImages = perFile?.includeImages ?? fm.includeImages;
    opts.splitChapters = fm.splitChapters;
  }
  opts.exportLocale = resolveExportLocale(settings.exportLocale);
  return opts;
}

async function run(): Promise<void> {
  process.on("SIGINT", (): void => {
    exitNicely();
  });
  process.on("unhandledRejection", (reason: unknown): void => {
    if (isCancelOrExit(reason)) exitNicely();
  });

  let settings = loadSettings();
  initI18n(settings.appLocale, settings.exportLocale);
  setCurrentTheme(resolveTheme(settings.cliThemeId));
  const outputDir = resolveOutputDir(settings.outputPath);
  console.log("ebook-x – ebook extractor");
  console.log("Output directory: " + outputDir + "\n");

  for (;;) {
    try {
      const action = await promptMainMenu();
      if (action === "exit") {
        exitNicely();
      }

      if (action === "settings") {
        settings = loadSettings();
        const next = await promptSettingsMenu(settings);
        if (next !== null) {
          settings = next;
          saveSettings(settings);
          console.log(t("settings_saved") + "\n");
        }
        continue;
      }

      if (action === "howto") {
        await promptHowTo();
        continue;
      }

      const startDir = process.cwd();
      let pickerState: Partial<SplitFilePickerState> | undefined = undefined;
      for (;;) {
        const fileSelection = await promptSelectEpubFiles(
          startDir,
          pickerState,
          settings
        );
        pickerState = undefined;
        if (!fileSelection) {
          console.log("No file selected.");
          break;
        }

        if (fileSelection === "settings") {
          settings = loadSettings();
          const next = await promptSettingsMenu(settings);
          if (next !== null) {
            settings = next;
            saveSettings(settings);
            console.log(t("settings_saved") + "\n");
          }
          continue;
        }

        const normalized: SelectedFile[] = fileSelection;
        pickerState = {
          selected: normalized,
          currentDir:
            normalized.length > 0
              ? path.dirname(normalized[0]!.path)
              : startDir,
          leftIndex: 0,
          rightIndex: 0,
          leftActive: true,
        };
        let formats: OutputFormat[] =
          settings.defaultFormats.length > 0
            ? settings.defaultFormats
            : (["md"] as OutputFormat[]);
        let exitToMainMenu = false;

        for (;;) {
          const action = await promptAfterFileSelection();
          if (!action || action === "cancel") {
            exitToMainMenu = true;
            pickerState = undefined;
            break;
          }
          if (action === "back") break;

          if (action === "select_formats") {
            const f = await promptOutputFormatsMulti(formats);
            if (f && f.length > 0) formats = f;
            continue;
          }

          if (action === "change_settings") {
            settings = loadSettings();
            const next = await promptSettingsMenu(settings);
            if (next !== null) {
              settings = next;
              saveSettings(settings);
              console.log(t("settings_saved") + "\n");
            }
            continue;
          }

          if (action === "view_selected_files") {
            const updated = await promptViewSelectedFilesAndSettings(
              normalized,
              formats,
              settings
            );
            if (updated !== null) {
              normalized.length = 0;
              normalized.push(...updated);
            }
            continue;
          }

          if (action === "extract") {
            if (formats.length === 0) {
              formats =
                settings.defaultFormats.length > 0
                  ? settings.defaultFormats
                  : (["md"] as OutputFormat[]);
            }
            const rootOutputDir = resolveOutputDir(settings.outputPath);
            const useFormatSubdirs = formats.length > 1;

            for (let i = 0; i < normalized.length; i++) {
              const file = normalized[i]!;
              const basename = file.outputBasename;
              const bookDir = path.join(rootOutputDir, basename);

              if (fs.existsSync(bookDir)) {
                clearScreen();
                const overwrite = await promptFramedSelect(
                  `Directory already exists: ${bookDir}. Remove and recreate?`,
                  [
                    { name: "Yes", value: "Yes" },
                    { name: "No", value: "No" },
                  ],
                  " ↑/↓ move  Enter select  Esc back",
                  1
                );
                if (overwrite === "Yes") {
                  fs.rmSync(bookDir, { recursive: true });
                } else {
                  console.log("Skipped.\n");
                  continue;
                }
              }

              let lastResult: {
                outputDir: string;
                totalChapters: number;
              } | null = null;
              for (const format of formats) {
                const prefix =
                  normalized.length > 1
                    ? `[${i + 1}/${normalized.length}] `
                    : "";
                const formatLabel = formats.length > 1 ? ` ${format}` : "";
                console.log(
                  `${prefix}Converting ${path.basename(file.path)}${formatLabel}...`
                );
                const options = settingsToConvertOptions(
                  settings,
                  format,
                  file
                );
                const result = await convertEpub(
                  file.path,
                  basename,
                  format,
                  options,
                  rootOutputDir,
                  useFormatSubdirs ? format : undefined
                );
                lastResult = {
                  outputDir: result.outputDir,
                  totalChapters: result.totalChapters,
                };
              }
              if (lastResult) {
                const displayDir = useFormatSubdirs
                  ? bookDir
                  : lastResult.outputDir;
                await promptSuccessScreen({
                  outputDir: displayDir,
                  totalChapters: lastResult.totalChapters,
                });
              }
            }
            continue;
          }
        }

        if (exitToMainMenu) break;
      }
    } catch (err) {
      if (isCancelOrExit(err)) exitNicely();
      throw err;
    }
  }
}

run().catch((err: unknown) => {
  if (isCancelOrExit(err)) exitNicely();
  console.error(err);
  process.exit(1);
});
