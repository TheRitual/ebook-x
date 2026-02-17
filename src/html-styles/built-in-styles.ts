import type { HtmlStyleDefinition } from "./types.js";

function createStyle(
  name: string,
  bodyColor: string,
  bodyBg: string,
  titleColor: string,
  footerColor: string
): HtmlStyleDefinition {
  const fontStack = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  return {
    name,
    classes: [
      {
        class: "epub-x-body",
        label: "Body",
        rules: {
          "margin-left": "auto",
          "margin-right": "auto",
          padding: "1.5em 1em",
          "box-sizing": "border-box",
          "font-family": fontStack,
          "line-height": "1.6",
          "max-width": "42em",
          color: bodyColor,
          background: bodyBg,
        },
      },
      {
        class: "chapter-title",
        label: "Chapter title",
        rules: {
          "font-family": fontStack,
          color: titleColor,
          "font-size": "1.25em",
          margin: "1em 0 0.5em",
        },
      },
      {
        class: "toc-title",
        label: "TOC title",
        rules: {
          "font-family": fontStack,
          color: titleColor,
          margin: "1em 0 0.5em",
        },
      },
      {
        class: "toc-list",
        label: "TOC list",
        rules: {
          "padding-left": "1.5em",
          margin: "0.75em 0",
        },
      },
      {
        class: "toc-link",
        label: "TOC link",
        rules: {
          color: "inherit",
          "text-decoration": "none",
        },
      },
      {
        class: "epub-x-content",
        label: "Content",
        rules: {
          margin: "0.75em 0",
        },
      },
      {
        class: "extraction-footer",
        label: "Extraction footer",
        rules: {
          "font-size": "0.8em",
          color: footerColor,
          margin: "1em 0 0",
        },
      },
      {
        class: "extraction-footer-link",
        label: "Extraction footer link",
        rules: {
          color: "inherit",
          "text-decoration": "none",
        },
      },
      {
        class: "chapter-nav",
        label: "Chapter navigation",
        rules: {
          "font-size": "0.9em",
          color: footerColor,
          margin: "1em 0 0",
        },
      },
      {
        class: "chapter-nav-link",
        label: "Chapter navigation link",
        rules: {
          color: "inherit",
          "text-decoration": "none",
        },
      },
    ],
  };
}

export const BUILT_IN_HTML_STYLES: Record<string, HtmlStyleDefinition> = {
  default: createStyle("Default", "#1a1a1a", "#f8f8f8", "#1a1a1a", "#6b6b6b"),
  contrasting: createStyle(
    "Contrasting",
    "#ffffff",
    "#000000",
    "#ffffff",
    "#b0b0b0"
  ),
  "rose-pine": createStyle(
    "Rosé Pine",
    "#e0def4",
    "#191724",
    "#eb6f92",
    "#6e6a86"
  ),
  "gruvbox-dark": createStyle(
    "Gruvbox Dark",
    "#ebdbb2",
    "#282828",
    "#fabd2f",
    "#928374"
  ),
  "gruvbox-light": createStyle(
    "Gruvbox Light",
    "#3c3836",
    "#fbf1c7",
    "#b57614",
    "#7c6f64"
  ),
  nord: createStyle("Nord", "#d8dee9", "#2e3440", "#88c0d0", "#4c566a"),
  dracula: createStyle("Dracula", "#f8f8f2", "#282a36", "#bd93f9", "#6272a4"),
};

export function getBuiltInHtmlStyleById(
  id: string
): HtmlStyleDefinition | null {
  const style = BUILT_IN_HTML_STYLES[id];
  if (!style) return null;
  return JSON.parse(JSON.stringify(style));
}
