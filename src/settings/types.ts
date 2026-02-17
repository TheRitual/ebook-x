import type { OutputFormat } from "../menus/types.js";
import type {
  ChapterTitleStyleTxt,
  ChapterFileNameStyle,
  HtmlStyle,
} from "../converter/types.js";
import type { AppLocaleSetting, ExportLocaleSetting } from "../i18n/types.js";

export type NewlinesHandling = "keep" | "one" | "two";

export interface MdFormatOptions {
  splitChapters: boolean;
  keepToc: boolean;
  tocInChaptersFile: boolean;
  indexWithToc: boolean;
  addBackLink: boolean;
  addNextLink: boolean;
  addPrevLink: boolean;
  includeImages: boolean;
}

export interface HtmlFormatOptions extends MdFormatOptions {
  style: HtmlStyle;
  htmlStyleId: string;
}

export interface JsonFormatOptions {
  splitChapters: boolean;
  includeImages: boolean;
}

export interface AppSettings {
  outputPath: string;
  defaultFormats: OutputFormat[];
  appLocale: AppLocaleSetting;
  exportLocale: ExportLocaleSetting;
  cliThemeId: string;
  addChapterTitles: boolean;
  chapterTitleStyleTxt: ChapterTitleStyleTxt;
  emDashToHyphen: boolean;
  sanitizeWhitespace: boolean;
  newlinesHandling: NewlinesHandling;
  chapterFileNameStyle: ChapterFileNameStyle;
  chapterFileNameCustomPrefix: string;
  formats: {
    md: MdFormatOptions;
    html: HtmlFormatOptions;
    json: JsonFormatOptions;
  };
}

const HTML_STYLE_LABELS: Record<HtmlStyle, string> = {
  none: "Pure HTML",
  styled: "Styled",
};

export function formatHtmlStyleLabel(style: HtmlStyle): string {
  return HTML_STYLE_LABELS[style];
}

export type { HtmlStyle };

const DEFAULT_MD_FORMAT: MdFormatOptions = {
  splitChapters: false,
  keepToc: false,
  tocInChaptersFile: false,
  indexWithToc: false,
  addBackLink: false,
  addNextLink: false,
  addPrevLink: false,
  includeImages: false,
};

const DEFAULT_HTML_FORMAT: HtmlFormatOptions = {
  ...DEFAULT_MD_FORMAT,
  style: "styled",
  htmlStyleId: "default",
};

const DEFAULT_JSON_FORMAT: JsonFormatOptions = {
  splitChapters: false,
  includeImages: false,
};

export const DEFAULT_SETTINGS: AppSettings = {
  outputPath: "",
  defaultFormats: ["txt"],
  appLocale: "system",
  exportLocale: "system",
  cliThemeId: "default",
  addChapterTitles: true,
  chapterTitleStyleTxt: "separated",
  emDashToHyphen: true,
  sanitizeWhitespace: true,
  newlinesHandling: "two",
  chapterFileNameStyle: "same",
  chapterFileNameCustomPrefix: "",
  formats: {
    md: { ...DEFAULT_MD_FORMAT },
    html: { ...DEFAULT_HTML_FORMAT },
    json: { ...DEFAULT_JSON_FORMAT },
  },
};
