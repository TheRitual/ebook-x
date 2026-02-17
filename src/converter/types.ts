export type ConvertFormat = "txt" | "md";

export type ChapterTitleStyleTxt = "separated" | "inline";

export interface ConvertOptions {
  includeImages: boolean;
  addChapterTitles: boolean;
  chapterTitleStyleTxt: ChapterTitleStyleTxt;
  emDashToHyphen: boolean;
  sanitizeWhitespace: boolean;
  keepToc: boolean;
  mdTocForChapters: boolean;
}

export interface ConvertResult {
  outputPath: string;
  totalChapters: number;
}
