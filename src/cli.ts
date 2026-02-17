#!/usr/bin/env node

import process from "node:process";
import { promptSelectEpubFile } from "./file-explorer/index.js";
import {
  promptMainMenu,
  promptOutputFormat,
  promptConvertOptions,
  promptOutputFilename,
} from "./menus/index.js";
import { convertEpub, resolveOutputDir } from "./converter/index.js";

function isCancelOrExit(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "CancelPromptError" || err.name === "ExitPromptError")
  );
}

async function run(): Promise<void> {
  const outputDir = resolveOutputDir();
  console.log("epub-x – ebook extractor");
  console.log("Output directory: " + outputDir + "\n");

  for (;;) {
    try {
      const action = await promptMainMenu();
      if (action === "exit") {
        console.log("Bye.");
        process.exit(0);
      }

      const startDir = process.cwd();
      const epubPath = await promptSelectEpubFile(startDir);
      if (!epubPath) {
        console.log("No file selected.");
        continue;
      }

      const format = await promptOutputFormat();
      const options = await promptConvertOptions(format);
      const outputBasename = await promptOutputFilename();

      console.log("Converting...");
      const result = await convertEpub(
        epubPath,
        outputBasename,
        format,
        options
      );
      console.log(
        "Done. Extracted " +
          result.totalChapters +
          " chapters to:\n  " +
          result.outputPath +
          "\n"
      );
    } catch (err) {
      if (isCancelOrExit(err)) {
        console.log("Bye.");
        process.exit(0);
      }
      throw err;
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
