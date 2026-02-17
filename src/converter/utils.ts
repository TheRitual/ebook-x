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

function htmlToPlainTextWithBlocks(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(h[1-6]|p|div|li|tr)\s*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

export function htmlToPlainText(html: string): string {
  const withBlocks = htmlToPlainTextWithBlocks(html);
  return decodeHtmlEntities(withBlocks);
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
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();
}

export function handleNewlines(
  text: string,
  handling: "keep" | "one" | "two"
): string {
  if (handling === "keep") return text;
  if (handling === "one") {
    return text.replace(/\n{3,}/g, "\n");
  }
  return text.replace(/\n{3,}/g, "\n\n");
}

export function removeImageLinksFromMarkdown(md: string): string {
  return md.replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/\n{3,}/g, "\n\n");
}

export function applyPostOptions(
  text: string,
  options: {
    emDashToHyphen: boolean;
    sanitizeWhitespace: boolean;
    newlinesHandling: "keep" | "one" | "two";
  }
): string {
  let result = text;
  if (options.emDashToHyphen) result = replaceEmDash(result);
  if (options.sanitizeWhitespace) {
    result = sanitizeWhitespace(result);
  } else {
    result = handleNewlines(result, options.newlinesHandling);
  }
  return result;
}

const EXTRACTION_FOOTER_URL = "https://jsr.io/@ritual/ebook-x/";

export function getExtractionFooter(format: "txt" | "md"): string {
  const sep = "\n\n---\n\n";
  if (format === "md") {
    return `${sep}*Extracted with [ebook-x](${EXTRACTION_FOOTER_URL}).*`;
  }
  return `${sep}Extracted with ebook-x. ${EXTRACTION_FOOTER_URL}`;
}
