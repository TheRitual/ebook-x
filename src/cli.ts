#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import fs from "node:fs";
import { promptSelectEpubFile } from "./file-explorer/index.js";
import {
  promptMainMenu,
  promptOutputFormat,
  promptOutputFilename,
  promptSuccessScreen,
  promptFramedSelect,
} from "./menus/index.js";
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
  format: "txt" | "md"
): ConvertOptions {
  return {
    includeImages: format === "md" ? settings.includeImages : false,
    addChapterTitles: settings.addChapterTitles,
    chapterTitleStyleTxt: settings.chapterTitleStyleTxt,
    emDashToHyphen: settings.emDashToHyphen,
    sanitizeWhitespace: settings.sanitizeWhitespace,
    newlinesHandling: settings.newlinesHandling,
    keepToc: settings.keepToc,
    mdTocForChapters: format === "md" ? settings.mdTocForChapters : false,
    splitChapters: settings.splitChapters,
    chapterFileNameStyle: settings.chapterFileNameStyle,
    chapterFileNameCustomPrefix: settings.chapterFileNameCustomPrefix,
    indexTocForChapters: format === "md" ? settings.indexTocForChapters : false,
    addBackLinkToChapters:
      format === "md" ? settings.addBackLinkToChapters : false,
  };
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
      const fileSelection = await promptSelectEpubFile(startDir);
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

      const epubPath = fileSelection;
      const format = await promptOutputFormat(settings.defaultFormat);
      const options = settingsToConvertOptions(settings, format);

      const sourceBasename = path.basename(epubPath, path.extname(epubPath));
      const outputBasename = await promptOutputFilename(sourceBasename);
      const basename = outputBasename || sourceBasename;

      const rootOutputDir = resolveOutputDir(settings.outputPath);
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

      console.log("Converting...");
      const result = await convertEpub(
        epubPath,
        basename,
        format,
        options,
        rootOutputDir
      );
      await promptSuccessScreen({
        outputDir: result.outputDir,
        totalChapters: result.totalChapters,
      });
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
