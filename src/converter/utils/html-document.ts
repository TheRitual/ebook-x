import type { HtmlTheme } from "../types.js";

export const DEFAULT_HTML_THEME: HtmlTheme = {
  background: "#f8f8f8",
  text: "#1a1a1a",
  headingColor: "#1a1a1a",
  headingFont: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  bodyFont: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
};

const LAYOUT_CSS = `
  body { margin-left: auto; margin-right: auto; padding: 1.5em 1em; box-sizing: border-box; }
  img { display: block; max-width: 100%; height: auto; margin: 1.5em auto; }
  figure { margin: 1.5em 0; text-align: center; }
  figure img { margin: 0 auto; }
  ul, ol { padding-left: 1.5em; }
  p { margin: 0.75em 0; }
  h1, h2, h3, h4, h5, h6 { margin: 1em 0 0.5em; }
`;

function escapeCssString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function getDefaultHtmlTheme(): HtmlTheme {
  return { ...DEFAULT_HTML_THEME };
}

export function buildThemedHtmlDocument(
  bodyContent: string,
  theme: HtmlTheme
): string {
  const bg = escapeCssString(theme.background);
  const text = escapeCssString(theme.text);
  const headingColor = escapeCssString(theme.headingColor || theme.text);
  const headingFont = escapeCssString(theme.headingFont);
  const bodyFont = escapeCssString(theme.bodyFont);
  const css = `
  :root { --bg: ${bg}; --text: ${text}; --heading: ${headingColor}; --font-heading: ${headingFont}; --font-body: ${bodyFont}; }
  body { background: var(--bg); color: var(--text); font-family: var(--font-body); line-height: 1.6; max-width: 42em; }
  h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); color: var(--heading); }
  a { color: inherit; }
  ${LAYOUT_CSS}
`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted content</title>
  <style>${css.trim()}</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export function buildMinimalHtmlDocument(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted content</title>
</head>
<body>
${bodyContent}
</body>
</html>`;
}
