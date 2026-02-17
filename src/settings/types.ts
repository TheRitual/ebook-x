import type { OutputFormat } from "../menus/types.js";
import type {
  ChapterTitleStyleTxt,
  ChapterFileNameStyle,
} from "../converter/types.js";

export type NewlinesHandling = "keep" | "one" | "two";

export interface AppSettings {
  outputPath: string;
  defaultFormat: OutputFormat;
  addChapterTitles: boolean;
  chapterTitleStyleTxt: ChapterTitleStyleTxt;
  emDashToHyphen: boolean;
  sanitizeWhitespace: boolean;
  newlinesHandling: NewlinesHandling;
  keepToc: boolean;
  splitChapters: boolean;
  chapterFileNameStyle: ChapterFileNameStyle;
  chapterFileNameCustomPrefix: string;
  mdTocForChapters: boolean;
  includeImages: boolean;
  indexTocForChapters: boolean;
  addBackLinkToChapters: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  outputPath: "",
  defaultFormat: "txt",
  addChapterTitles: true,
  chapterTitleStyleTxt: "separated",
  emDashToHyphen: true,
  sanitizeWhitespace: true,
  newlinesHandling: "two",
  keepToc: false,
  splitChapters: false,
  chapterFileNameStyle: "same",
  chapterFileNameCustomPrefix: "",
  mdTocForChapters: false,
  includeImages: false,
  indexTocForChapters: false,
  addBackLinkToChapters: false,
};
