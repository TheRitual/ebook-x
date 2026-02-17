#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import { promptSelectEpubFiles } from "./file-explorer/index.js";
import type { SelectedFile } from "./file-explorer/selected-file-types.js";
import {
  promptMainMenu,
  promptChangeSettingsBeforeConverting,
  promptSuccessScreen,
  promptFramedSelect,
} from "./menus/index.js";
import { promptOutputFormatsMulti } from "./menus/format-multi-select.js";
import { clearScreen } from "./menus/utils.js";
import { convertEpub, resolveOutputDir } from "./converter/index.js";
import { loadSettings, saveSettings } from "./settings/storage.js";
import { promptSettingsMenu } from "./settings/menu.js";
import type { AppSettings } from "./settings/types.js";
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
  const includeImages =
    perFile?.includeImages ??
    (format === "md" || format === "html" || format === "json"
      ? settings.includeImages
      : false);
  const opts: ConvertOptions = {
    chapterIndices: perFile?.chapterIndices ?? undefined,
    includeImages,
    addChapterTitles: settings.addChapterTitles,
    chapterTitleStyleTxt: settings.chapterTitleStyleTxt,
    emDashToHyphen: settings.emDashToHyphen,
    sanitizeWhitespace: settings.sanitizeWhitespace,
    newlinesHandling: settings.newlinesHandling,
    keepToc: settings.keepToc,
    mdTocForChapters:
      format === "md" || format === "html" ? settings.mdTocForChapters : false,
    splitChapters: settings.splitChapters,
    chapterFileNameStyle: settings.chapterFileNameStyle,
    chapterFileNameCustomPrefix: settings.chapterFileNameCustomPrefix,
    indexTocForChapters:
      format === "md" || format === "html"
        ? settings.indexTocForChapters
        : false,
    addBackLinkToChapters:
      format === "md" || format === "html"
        ? settings.addBackLinkToChapters
        : false,
  };
  if (format === "html") {
    opts.htmlStyle = settings.htmlStyle;
    opts.htmlTheme = settings.htmlTheme;
  }
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
  const outputDir = resolveOutputDir(settings.outputPath);
  console.log("epub-x – ebook extractor");
  console.log("Output directory: " + outputDir + "\n");

  for (;;) {
    try {
      const action = await promptMainMenu();
      if (action === "exit") {
        exitNicely();
      }

      if (action === "settings") {
        const next = await promptSettingsMenu(settings);
        if (next !== null) {
          settings = next;
          saveSettings(settings);
          console.log("Settings saved.\n");
        }
        continue;
      }

      const startDir = process.cwd();
      const fileSelection = await promptSelectEpubFiles(startDir);
      if (!fileSelection) {
        console.log("No file selected.");
        continue;
      }

      if (fileSelection === "settings") {
        const next = await promptSettingsMenu(settings);
        if (next !== null) {
          settings = next;
          saveSettings(settings);
          console.log("Settings saved.\n");
        }
        continue;
      }

      const normalized: SelectedFile[] = fileSelection;

      const changeSettings = await promptChangeSettingsBeforeConverting();
      if (changeSettings) {
        const next = await promptSettingsMenu(settings);
        if (next !== null) {
          settings = next;
          saveSettings(settings);
          console.log("Settings saved.\n");
        }
      }

      const formats = await promptOutputFormatsMulti(settings.defaultFormats);
      if (!formats || formats.length === 0) {
        console.log("No format selected.");
        continue;
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

        let lastResult: { outputDir: string; totalChapters: number } | null =
          null;
        for (const format of formats) {
          const prefix =
            normalized.length > 1 ? `[${i + 1}/${normalized.length}] ` : "";
          const formatLabel = formats.length > 1 ? ` ${format}` : "";
          console.log(
            `${prefix}Converting ${path.basename(file.path)}${formatLabel}...`
          );
          const options = settingsToConvertOptions(settings, format, file);
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
          const displayDir = useFormatSubdirs ? bookDir : lastResult.outputDir;
          await promptSuccessScreen({
            outputDir: displayDir,
            totalChapters: lastResult.totalChapters,
          });
        }
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
