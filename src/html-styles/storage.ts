import fs from "node:fs";
import path from "node:path";
import { getHtmlStylesDir } from "../utils/config-dir.js";
import type { HtmlStyleDefinition, HtmlStyleClassRule } from "./types.js";
import { getBuiltInHtmlStyleById } from "./built-in-styles.js";
import { BUILT_IN_HTML_STYLE_ID } from "./types.js";

const STYLE_EXT = ".json";

function stylePath(id: string): string {
  const dir = getHtmlStylesDir();
  fs.mkdirSync(dir, { recursive: true });
  const safe = path.basename(id).replace(/\.json$/i, "");
  return path.join(dir, safe + STYLE_EXT);
}

function parseClassRule(o: Record<string, unknown>): HtmlStyleClassRule | null {
  if (typeof o.class !== "string" || typeof o.label !== "string") return null;
  if (!o.rules || typeof o.rules !== "object") return null;
  const rules: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.rules)) {
    if (typeof v === "string") rules[k] = v;
  }
  return { class: o.class, label: o.label, rules };
}

function parseStyleFile(content: string): HtmlStyleDefinition | null {
  try {
    const data = JSON.parse(content) as Record<string, unknown>;
    if (typeof data.name !== "string") return null;
    if (!Array.isArray(data.classes)) return null;
    const classes: HtmlStyleClassRule[] = [];
    for (const c of data.classes) {
      if (c && typeof c === "object") {
        const rule = parseClassRule(c as Record<string, unknown>);
        if (rule) classes.push(rule);
      }
    }
    return { name: data.name, classes };
  } catch {
    return null;
  }
}

export function getBuiltInHtmlStyle(
  id: string = BUILT_IN_HTML_STYLE_ID
): HtmlStyleDefinition {
  const style = getBuiltInHtmlStyleById(id);
  if (style) return style;
  return getBuiltInHtmlStyleById(BUILT_IN_HTML_STYLE_ID)!;
}

export function listCustomHtmlStyleIds(): string[] {
  const dir = getHtmlStylesDir();
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  return files
    .filter((f) => f.endsWith(STYLE_EXT))
    .map((f) => path.basename(f, STYLE_EXT));
}

export function loadCustomHtmlStyle(id: string): HtmlStyleDefinition | null {
  const filePath = stylePath(id);
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return parseStyleFile(content);
  } catch {
    return null;
  }
}

export function saveCustomHtmlStyle(
  id: string,
  style: HtmlStyleDefinition
): void {
  const filePath = stylePath(id);
  const payload = { name: style.name, classes: style.classes };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export function deleteCustomHtmlStyle(id: string): boolean {
  const filePath = stylePath(id);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function loadHtmlStyle(
  id: string | undefined
): HtmlStyleDefinition | null {
  const sid = typeof id === "string" && id.trim() ? id : BUILT_IN_HTML_STYLE_ID;
  const builtIn = getBuiltInHtmlStyleById(sid);
  if (builtIn) return builtIn;
  return loadCustomHtmlStyle(sid);
}
