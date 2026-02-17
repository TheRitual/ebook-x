import type { ConvertOptions } from "./types.js";

export const defaultConvertOptions: ConvertOptions = {
  includeImages: false,
  addChapterTitles: false,
  chapterTitleStyleTxt: "separated",
  emDashToHyphen: false,
  sanitizeWhitespace: false,
  newlinesHandling: "two",
  keepToc: false,
  mdTocForChapters: false,
  splitChapters: false,
  chapterFileNameStyle: "same",
  chapterFileNameCustomPrefix: "",
  indexTocForChapters: false,
  addBackLinkToChapters: false,
};
