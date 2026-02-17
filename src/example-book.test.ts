/**
 * Integration tests using a user-provided example book at books/testbook.epub.
 * The books/ directory is in .gitignore; these tests are skipped when the file is absent.
 */
import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { convertEpub, resolveOutputDir } from "./converter/index.js";
import { defaultConvertOptions } from "./converter/default-options.js";
import { listEntries } from "./file-explorer/utils.js";

const BOOKS_DIR = path.join(process.cwd(), "books");
const TEST_BOOK_PATH = path.join(BOOKS_DIR, "testbook.epub");
const TEST_OUTPUT_BASENAME = "__example_book_test__";

function testBookExists(): boolean {
  return fs.existsSync(TEST_BOOK_PATH);
}

async function removeTestOutputs(): Promise<void> {
  const outDir = resolveOutputDir("");
  const bookDir = path.join(outDir, TEST_OUTPUT_BASENAME);
  if (fs.existsSync(bookDir)) fs.rmSync(bookDir, { recursive: true });
}

describe.skipIf(!testBookExists())("example book (books/testbook.epub)", () => {
  afterEach(async () => {
    await removeTestOutputs();
  });

  it("converts to txt and writes non-empty content", async () => {
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "txt",
      defaultConvertOptions,
      outDir
    );
    expect(result.totalChapters).toBeGreaterThan(0);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
    expect(result.outputPath).toMatch(/\.txt$/);
  });

  it("converts to md and writes non-empty content", async () => {
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "md",
      defaultConvertOptions,
      outDir
    );
    expect(result.totalChapters).toBeGreaterThan(0);
    expect(fs.existsSync(result.outputPath)).toBe(true);
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content.length).toBeGreaterThan(0);
    expect(result.outputPath).toMatch(/\.md$/);
  });

  it("file explorer lists testbook.epub in books directory", () => {
    expect(fs.existsSync(BOOKS_DIR)).toBe(true);
    const entries = listEntries(BOOKS_DIR);
    const epubNames = entries
      .filter((e) => e.type === "epub")
      .map((e) => e.name);
    expect(epubNames).toContain("testbook.epub");
  });

  it("with addChapterTitles outputs Chapter in txt", async () => {
    const options = {
      ...defaultConvertOptions,
      addChapterTitles: true,
      chapterTitleStyleTxt: "inline" as const,
    };
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "txt",
      options,
      outDir
    );
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content).toMatch(/Chapter 1/);
  });

  it("with keepToc includes table of contents in output", async () => {
    const options = {
      ...defaultConvertOptions,
      keepToc: true,
    };
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "txt",
      options,
      outDir
    );
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content).toMatch(/Table of contents/i);
  });

  it("with emDashToHyphen replaces em dash in output", async () => {
    const options = {
      ...defaultConvertOptions,
      emDashToHyphen: true,
    };
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "txt",
      options,
      outDir
    );
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content).not.toMatch(/—/);
  });

  it("with mdTocForChapters includes Table of contents in md", async () => {
    const options = {
      ...defaultConvertOptions,
      mdTocForChapters: true,
    };
    const outDir = resolveOutputDir("");
    const result = await convertEpub(
      TEST_BOOK_PATH,
      TEST_OUTPUT_BASENAME,
      "md",
      options,
      outDir
    );
    const content = fs.readFileSync(result.outputPath, "utf-8");
    expect(content).toMatch(/Table of contents/);
  });
});
