import type { ConvertOptions } from "./types.js";

export const defaultConvertOptions: ConvertOptions = {
  includeImages: false,
  addChapterTitles: false,
  chapterTitleStyleTxt: "separated",
  emDashToHyphen: false,
  sanitizeWhitespace: false,
  keepToc: false,
  mdTocForChapters: false,
};
