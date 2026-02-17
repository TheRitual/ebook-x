import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { EPub } from "epub2";
import type { ConvertFormat, ConvertResult, ConvertOptions } from "./types.js";
import {
  htmlToMarkdown,
  htmlToPlainText,
  applyPostOptions,
  removeImageLinksFromMarkdown,
  decodeHtmlEntities,
} from "./utils.js";

const DEFAULT_OUTPUT_DIR = "output";
const IMG_SUBDIR = "__IMG__";

function getOutputDir(): string {
  return path.join(process.cwd(), DEFAULT_OUTPUT_DIR);
}

function isImageManifestItem(
  href: string | undefined,
  mediaType: string | undefined
): boolean {
  if (!href) return false;
  const mt = (mediaType ?? "").toLowerCase();
  if (mt.startsWith("image/")) return true;
  const ext = path.extname(href).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext);
}

function resolveChapterRelative(baseHref: string, imgSrc: string): string {
  const baseDir = path.dirname(baseHref.replace(/\\/g, "/"));
  const joined = path.join(baseDir, imgSrc.replace(/\\/g, "/"));
  return path.normalize(joined).replace(/\\/g, "/");
}

function extractImgSrcs(html: string): string[] {
  const srcs: string[] = [];
  const re = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) srcs.push(m[1]!);
  return srcs;
}

function rewriteMarkdownImageUrls(
  md: string,
  srcToPath: Map<string, string>
): string {
  let result = md;
  for (const [src, newPath] of srcToPath) {
    const esc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`(!\\[[^\\]]*\\]\\()${esc}(\\))`, "g"),
      `$1${newPath}$2`
    );
  }
  return result;
}

export async function convertEpub(
  epubPath: string,
  outputBasename: string,
  format: ConvertFormat,
  options: ConvertOptions
): Promise<ConvertResult> {
  const epub = await EPub.createAsync(epubPath);
  const flow = epub.flow;
  const total = flow.length;
  const outDir = getOutputDir();
  fs.mkdirSync(outDir, { recursive: true });

  const imgDir =
    format === "md" && options.includeImages
      ? path.join(outDir, outputBasename, IMG_SUBDIR)
      : null;
  if (imgDir) fs.mkdirSync(imgDir, { recursive: true });

  interface ManifestItem {
    href?: string;
    "media-type"?: string;
    mediaType?: string;
  }
  const hrefToId = new Map<string, string>();
  for (const [id, item] of Object.entries(epub.manifest) as [
    string,
    ManifestItem,
  ][]) {
    const href = item?.href;
    const mt = item?.["media-type"] ?? item?.mediaType;
    if (href && isImageManifestItem(href, mt)) {
      const norm = path.normalize(href).replace(/\\/g, "/");
      hrefToId.set(norm, id);
    }
  }

  const savedImages = new Map<string, string>();
  const srcToNewPath = new Map<string, string>();
  const imagePrefix = `${outputBasename}/${IMG_SUBDIR}`;

  const tocEntries: { index: number; title: string }[] = [];
  const parts: string[] = [];

  if (options.keepToc && epub.toc?.length) {
    interface TocEntry {
      title?: string;
    }
    const toc = epub.toc as TocEntry[];
    const tocLines =
      format === "md"
        ? toc.map((t: TocEntry) => `- ${t?.title ?? ""}`).filter(Boolean)
        : toc.map((t: TocEntry) => (t?.title ?? "").trim()).filter(Boolean);
    if (tocLines.length) {
      parts.push(
        format === "md"
          ? "## Table of contents\n\n" + tocLines.join("\n")
          : "Table of contents\n\n" + tocLines.join("\n")
      );
    }
  }

  for (let i = 0; i < flow.length; i++) {
    const chapter = flow[i];
    const id = chapter?.id;
    if (!id) continue;

    const chapterTitle = chapter?.title?.trim() ?? "";
    const chapterNum = i + 1;

    const raw = await epub.getChapterRawAsync(id);
    const chapterHref = chapter?.href ?? "";

    if (format === "md" && options.includeImages) {
      const srcs = extractImgSrcs(raw);
      for (const src of srcs) {
        const resolved = resolveChapterRelative(chapterHref, src);
        const manifestId =
          hrefToId.get(resolved) ?? hrefToId.get(path.basename(resolved));
        if (manifestId) {
          let newRel = savedImages.get(manifestId);
          if (!newRel) {
            try {
              const [buf, mime] = await epub.getImageAsync(manifestId);
              const ext = mime?.startsWith("image/")
                ? (mime.split("/")[1] ?? "png")
                : "png";
              const safeName = `${manifestId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
              const outPath = path.join(imgDir!, safeName);
              fs.writeFileSync(outPath, buf);
              newRel = `${imagePrefix}/${safeName}`;
              savedImages.set(manifestId, newRel);
            } catch {
              // skip failed image
            }
          }
          if (newRel) srcToNewPath.set(src, newRel);
        }
      }
    }

    let content = format === "md" ? htmlToMarkdown(raw) : htmlToPlainText(raw);

    if (format === "md" && options.includeImages && srcToNewPath.size) {
      content = rewriteMarkdownImageUrls(content, srcToNewPath);
    }
    if (format === "md" && !options.includeImages) {
      content = removeImageLinksFromMarkdown(content);
    }

    content = decodeHtmlEntities(content);
    content = applyPostOptions(content, {
      emDashToHyphen: options.emDashToHyphen,
      sanitizeWhitespace: options.sanitizeWhitespace,
    });

    if (options.addChapterTitles) {
      const titleLine =
        format === "md"
          ? `### Rozdział ${chapterNum}${chapterTitle ? ` - ${chapterTitle}` : ""}`
          : options.chapterTitleStyleTxt === "inline"
            ? `Rozdział ${chapterNum}${chapterTitle ? ` - ${chapterTitle}` : ""}`
            : chapterTitle
              ? `Rozdział ${chapterNum}\n\n${chapterTitle}`
              : `Rozdział ${chapterNum}`;
      content = titleLine + "\n\n" + content;
    }

    tocEntries.push({ index: chapterNum, title: chapterTitle });
    parts.push(content);
    process.stdout.write(`\rConverting chapter ${i + 1}/${total}...`);
  }
  process.stdout.write("\n");

  let body = parts.join("\n\n");
  if (format === "md" && options.mdTocForChapters && tocEntries.length) {
    const tocMd =
      "## Spis rozdziałów\n\n" +
      tocEntries
        .map((e) => `- Rozdział ${e.index}${e.title ? ` - ${e.title}` : ""}`)
        .join("\n");
    body = tocMd + "\n\n" + body;
  }

  const ext = format === "md" ? ".md" : ".txt";
  const outputPath = path.join(outDir, outputBasename + ext);
  fs.writeFileSync(outputPath, body, "utf-8");

  return { outputPath, totalChapters: total };
}

export function resolveOutputDir(): string {
  const dir = getOutputDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.resolve(dir);
}
