import type { OutputFormat } from "../menus/types.js";
import type {
  ChapterTitleStyleTxt,
  ChapterFileNameStyle,
  HtmlStyle,
  HtmlTheme,
} from "../converter/types.js";
import { DEFAULT_HTML_THEME } from "../converter/utils/html-document.js";

export type NewlinesHandling = "keep" | "one" | "two";

export interface AppSettings {
  outputPath: string;
  defaultFormats: OutputFormat[];
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
  htmlStyle: HtmlStyle;
  htmlTheme: HtmlTheme;
}

const HTML_STYLE_LABELS: Record<HtmlStyle, string> = {
  none: "None (no CSS)",
  styled: "Styled (sans-serif, centered images)",
  custom: "Custom theme (colors & fonts)",
};

export function formatHtmlStyleLabel(style: HtmlStyle): string {
  return HTML_STYLE_LABELS[style];
}

export type { HtmlStyle };

export const DEFAULT_SETTINGS: AppSettings = {
  outputPath: "",
  defaultFormats: ["txt"],
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
  htmlStyle: "styled",
  htmlTheme: { ...DEFAULT_HTML_THEME },
};
