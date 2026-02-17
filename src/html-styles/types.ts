export interface HtmlStyleClassRule {
  class: string;
  label: string;
  rules: Record<string, string>;
}

export interface HtmlStyleDefinition {
  name: string;
  classes: HtmlStyleClassRule[];
}

export const BUILT_IN_HTML_STYLE_ID = "default";

export const BUILT_IN_HTML_STYLE_IDS: readonly string[] = [
  "default",
  "contrasting",
  "rose-pine",
  "gruvbox-dark",
  "gruvbox-light",
  "nord",
  "dracula",
];

export function isBuiltInHtmlStyleId(id: string): boolean {
  return BUILT_IN_HTML_STYLE_IDS.includes(id);
}
