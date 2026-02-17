import type { ConvertOptions } from "../../converter/types.js";
import { defaultConvertOptions } from "../../converter/default-options.js";
import type { ExtractOptions } from "../types.js";

export function buildConvertOptions(
  input: ExtractOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for format-specific defaults
  _format: "txt" | "md" | "html" | "json"
): ConvertOptions {
  const opts: ConvertOptions = { ...defaultConvertOptions };
  opts.chapterIndices = input.chapterIndices ?? undefined;
  if (input.includeImages !== undefined)
    opts.includeImages = input.includeImages;
  if (input.addChapterTitles !== undefined)
    opts.addChapterTitles = input.addChapterTitles;
  if (input.chapterTitleStyleTxt !== undefined)
    opts.chapterTitleStyleTxt = input.chapterTitleStyleTxt;
  if (input.emDashToHyphen !== undefined)
    opts.emDashToHyphen = input.emDashToHyphen;
  if (input.sanitizeWhitespace !== undefined)
    opts.sanitizeWhitespace = input.sanitizeWhitespace;
  if (input.newlinesHandling !== undefined)
    opts.newlinesHandling = input.newlinesHandling;
  if (input.keepToc !== undefined) opts.keepToc = input.keepToc;
  if (input.mdTocForChapters !== undefined)
    opts.mdTocForChapters = input.mdTocForChapters;
  if (input.splitChapters !== undefined)
    opts.splitChapters = input.splitChapters;
  if (input.chapterFileNameStyle !== undefined)
    opts.chapterFileNameStyle = input.chapterFileNameStyle;
  if (input.chapterFileNameCustomPrefix !== undefined)
    opts.chapterFileNameCustomPrefix = input.chapterFileNameCustomPrefix;
  if (input.indexTocForChapters !== undefined)
    opts.indexTocForChapters = input.indexTocForChapters;
  if (input.addBackLinkToChapters !== undefined)
    opts.addBackLinkToChapters = input.addBackLinkToChapters;
  if (input.addNextLinkToChapters !== undefined)
    opts.addNextLinkToChapters = input.addNextLinkToChapters;
  if (input.addPrevLinkToChapters !== undefined)
    opts.addPrevLinkToChapters = input.addPrevLinkToChapters;
  if (input.htmlStyle !== undefined) opts.htmlStyle = input.htmlStyle;
  if (input.htmlStyleId !== undefined) opts.htmlStyleId = input.htmlStyleId;
  if (input.exportLocale !== undefined) opts.exportLocale = input.exportLocale;
  return opts;
}
