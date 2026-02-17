export type ConvertFormat = "txt" | "md";

export type ChapterTitleStyleTxt = "separated" | "inline";

export type NewlinesHandling = "keep" | "one" | "two";

export type ChapterFileNameStyle = "same" | "chapter" | "custom";

export interface ConvertOptions {
  includeImages: boolean;
  addChapterTitles: boolean;
  chapterTitleStyleTxt: ChapterTitleStyleTxt;
  emDashToHyphen: boolean;
  sanitizeWhitespace: boolean;
  newlinesHandling: NewlinesHandling;
  keepToc: boolean;
  mdTocForChapters: boolean;
  splitChapters: boolean;
  chapterFileNameStyle: ChapterFileNameStyle;
  chapterFileNameCustomPrefix: string;
  indexTocForChapters: boolean;
  addBackLinkToChapters: boolean;
}

export interface ConvertResult {
  outputPath: string;
  outputDir: string;
  totalChapters: number;
}
