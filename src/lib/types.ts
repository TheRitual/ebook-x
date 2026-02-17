import type {
  ChapterTitleStyleTxt,
  NewlinesHandling,
  ChapterFileNameStyle,
  HtmlStyle,
} from "../converter/types.js";
import type { ConvertResult } from "../converter/types.js";

export interface ExtractOptionsBase {
  sourcePath: string;
  outputPath: string;
  outputName: string;
  flatOutput?: boolean;
  chapterIndices?: number[] | null;
  includeImages?: boolean;
  addChapterTitles?: boolean;
  chapterTitleStyleTxt?: ChapterTitleStyleTxt;
  emDashToHyphen?: boolean;
  sanitizeWhitespace?: boolean;
  newlinesHandling?: NewlinesHandling;
  keepToc?: boolean;
  mdTocForChapters?: boolean;
  splitChapters?: boolean;
  chapterFileNameStyle?: ChapterFileNameStyle;
  chapterFileNameCustomPrefix?: string;
  indexTocForChapters?: boolean;
  addBackLinkToChapters?: boolean;
  addNextLinkToChapters?: boolean;
  addPrevLinkToChapters?: boolean;
  htmlStyle?: HtmlStyle;
  htmlStyleId?: string;
  exportLocale?: string;
}

export type ExtractOptions = ExtractOptionsBase;

export type ExtractResult = ConvertResult;
