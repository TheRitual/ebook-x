import { describe, it, expect } from "vitest";
import { defaultConvertOptions } from "./default-options.js";
import type { ConvertOptions, ChapterTitleStyleTxt } from "./types.js";

describe("defaultConvertOptions", () => {
  it("has all required ConvertOptions keys", () => {
    const required: (keyof ConvertOptions)[] = [
      "includeImages",
      "addChapterTitles",
      "chapterTitleStyleTxt",
      "emDashToHyphen",
      "sanitizeWhitespace",
      "newlinesHandling",
      "keepToc",
      "mdTocForChapters",
      "splitChapters",
      "chapterFileNameStyle",
      "chapterFileNameCustomPrefix",
      "indexTocForChapters",
      "addBackLinkToChapters",
      "addNextLinkToChapters",
      "addPrevLinkToChapters",
    ];
    for (const key of required) {
      expect(key in defaultConvertOptions).toBe(true);
    }
  });

  it("includeImages is false", () => {
    expect(defaultConvertOptions.includeImages).toBe(false);
  });

  it("chapterTitleStyleTxt is valid", () => {
    const valid: ChapterTitleStyleTxt[] = ["separated", "inline"];
    expect(valid).toContain(defaultConvertOptions.chapterTitleStyleTxt);
  });

  it("can be passed to convertEpub without type error", () => {
    const opts: ConvertOptions = defaultConvertOptions;
    expect(opts.addChapterTitles).toBe(false);
    expect(opts.keepToc).toBe(false);
  });
});
