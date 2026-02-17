export type ConvertFormat = "txt" | "md" | "json" | "html";

export type ChapterTitleStyleTxt = "separated" | "inline";

export type NewlinesHandling = "keep" | "one" | "two";

export type ChapterFileNameStyle = "same" | "chapter" | "custom";

export type HtmlStyle = "none" | "styled" | "custom";

export interface HtmlTheme {
  background: string;
  text: string;
  headingColor: string;
  headingFont: string;
  bodyFont: string;
}

export interface ConvertOptions {
  chapterIndices?: number[] | null;
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
  htmlStyle?: HtmlStyle;
  htmlTheme?: HtmlTheme;
}

export interface EpubChapterInfo {
  index: number;
  title: string;
}

export interface ConvertResult {
  outputPath: string;
  outputDir: string;
  totalChapters: number;
}
