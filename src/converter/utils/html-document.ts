import type { HtmlStyleDefinition } from "../../html-styles/types.js";
import {
  validateCssPropertyName,
  validateCssPropertyValue,
  escapeCssValue,
} from "../../html-styles/utils/validate-css.js";

function buildCssFromStyle(style: HtmlStyleDefinition): string {
  const lines: string[] = [];
  for (const cls of style.classes) {
    const selector = "." + cls.class.replace(/[^a-z0-9-_]/gi, "");
    const decls: string[] = [];
    const seenKeys = new Set<string>();
    for (const [key, value] of Object.entries(cls.rules)) {
      const keyTrim = key.trim();
      if (seenKeys.has(keyTrim)) continue;
      const nameResult = validateCssPropertyName(keyTrim);
      if (!nameResult.ok) continue;
      const valueResult = validateCssPropertyValue(value);
      if (!valueResult.ok) continue;
      seenKeys.add(keyTrim);
      decls.push(`  ${keyTrim}: ${escapeCssValue(value)};`);
    }
    if (decls.length > 0) {
      lines.push(`${selector} {\n${decls.join("\n")}\n}`);
    }
  }
  return lines.join("\n");
}

export function buildStyledHtmlDocument(
  bodyContent: string,
  style: HtmlStyleDefinition
): string {
  const css = buildCssFromStyle(style);
  const layoutCss = `
  .epub-x-body img { display: block; max-width: 100%; height: auto; margin: 1.5em auto; }
  .epub-x-body figure { margin: 1.5em 0; text-align: center; }
  .epub-x-body figure img { margin: 0 auto; }
  .epub-x-body ul, .epub-x-body ol { padding-left: 1.5em; }
  .epub-x-body p { margin: 0.75em 0; }
  .extraction-footer-link:hover, .chapter-nav-link:hover { text-decoration: underline; }
`;
  const fullCss = css + layoutCss;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted content</title>
  <style>${fullCss.trim()}</style>
</head>
<body class="epub-x-body">
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
