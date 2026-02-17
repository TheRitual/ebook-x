import Turndown from "turndown";

const turndown = new Turndown({ headingStyle: "atx" });

const ENTITY_DECIMAL = /&#(\d+);/g;
const ENTITY_HEX = /&#x([0-9a-fA-F]+);/g;
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(ENTITY_DECIMAL, (_, code) =>
      String.fromCharCode(parseInt(code, 10))
    )
    .replace(ENTITY_HEX, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&([a-z#0-9]+);/gi, (_, name) => {
      const key = name.toLowerCase();
      if (key in NAMED_ENTITIES) return NAMED_ENTITIES[key]!;
      return `&${name};`;
    })
    .replace(/\u00A0/g, " ");
}

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}

function stripTagsAndCollapse(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

export function htmlToPlainText(html: string): string {
  const stripped = stripTagsAndCollapse(html);
  return decodeHtmlEntities(stripped).trim();
}

export function replaceEmDash(text: string): string {
  return text.replace(/—/g, "-");
}

export function sanitizeWhitespace(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/\r\n?|\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();
}

export function removeImageLinksFromMarkdown(md: string): string {
  return md.replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/\n{3,}/g, "\n\n");
}

export function applyPostOptions(
  text: string,
  options: {
    emDashToHyphen: boolean;
    sanitizeWhitespace: boolean;
  }
): string {
  let result = text;
  if (options.emDashToHyphen) result = replaceEmDash(result);
  if (options.sanitizeWhitespace) result = sanitizeWhitespace(result);
  return result;
}
