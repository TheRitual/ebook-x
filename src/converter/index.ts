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
  getExtractionFooter,
} from "./utils.js";

const DEFAULT_OUTPUT_DIR = "output";
const IMG_SUBDIR = "__IMG__";
const CHAPTERS_DIR = "chapters";

function getChapterFileName(
  outputBasename: string,
  chapterNum: number,
  options: {
    chapterFileNameStyle: ConvertOptions["chapterFileNameStyle"];
    chapterFileNameCustomPrefix: string;
  },
  ext: string
): string {
  const num = String(chapterNum);
  switch (options.chapterFileNameStyle) {
    case "same":
      return `${outputBasename}-chapter-${num}${ext}`;
    case "chapter":
      return `chapter-${num}${ext}`;
    case "custom": {
      const prefix = options.chapterFileNameCustomPrefix.trim() || "chapter";
      return `${prefix}${num}${ext}`;
    }
  }
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

function imagePathsForChapterFile(md: string): string {
  return md.replace(/\]\(\s*__IMG__\//g, "](../__IMG__/");
}

function headerToAnchorSlug(headerText: string): string {
  return headerText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

export async function convertEpub(
  epubPath: string,
  outputBasename: string,
  format: ConvertFormat,
  options: ConvertOptions,
  outputDir: string
): Promise<ConvertResult> {
  const epub = await EPub.createAsync(epubPath);
  const flow = epub.flow;
  const total = flow.length;

  const bookDir = path.join(outputDir, outputBasename);
  fs.mkdirSync(bookDir, { recursive: true });

  const imgDir =
    format === "md" && options.includeImages
      ? path.join(bookDir, IMG_SUBDIR)
      : null;
  if (imgDir) fs.mkdirSync(imgDir, { recursive: true });

  const imagePrefix = IMG_SUBDIR;

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

  const tocEntries: { index: number; title: string }[] = [];
  const parts: string[] = [];

  if (options.keepToc && !options.splitChapters && epub.toc?.length) {
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

  const ext = format === "md" ? ".md" : ".txt";

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
              const extImg = mime?.startsWith("image/")
                ? (mime.split("/")[1] ?? "png")
                : "png";
              const safeName = `${manifestId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${extImg}`;
              const outPath = path.join(imgDir!, safeName);
              fs.writeFileSync(outPath, buf);
              newRel = `${imagePrefix}/${safeName}`;
              savedImages.set(manifestId, newRel);
            } catch {
              // skip
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
      newlinesHandling: options.newlinesHandling,
    });

    if (options.addChapterTitles) {
      const titleLine =
        format === "md"
          ? `### Chapter ${chapterNum}${chapterTitle ? ` - ${chapterTitle}` : ""}`
          : options.chapterTitleStyleTxt === "inline"
            ? `Chapter ${chapterNum}${chapterTitle ? ` - ${chapterTitle}` : ""}`
            : chapterTitle
              ? `Chapter ${chapterNum}\n\n${chapterTitle}`
              : `Chapter ${chapterNum}`;
      content = titleLine + "\n\n" + content;
    }

    tocEntries.push({ index: chapterNum, title: chapterTitle });
    parts.push(content);
    process.stdout.write(`\rConverting chapter ${i + 1}/${total}...`);
  }
  process.stdout.write("\n");

  const mainFilePath = path.join(bookDir, outputBasename + ext);

  if (options.splitChapters) {
    const chaptersDir = path.join(bookDir, CHAPTERS_DIR);
    fs.mkdirSync(chaptersDir, { recursive: true });

    const indexLink =
      format === "md" &&
      options.indexTocForChapters &&
      options.addBackLinkToChapters
        ? `\n\n[← Back to index](../${outputBasename}.md)\n`
        : "";

    for (let i = 0; i < parts.length; i++) {
      const chapterNum = i + 1;
      const fileName = getChapterFileName(
        outputBasename,
        chapterNum,
        options,
        ext
      );
      const chapterPath = path.join(chaptersDir, fileName);
      let chapterContent = parts[i]!;
      if (format === "md") {
        chapterContent = imagePathsForChapterFile(chapterContent);
        if (indexLink) chapterContent = chapterContent + indexLink;
      }
      chapterContent = chapterContent + getExtractionFooter(format);
      fs.writeFileSync(chapterPath, chapterContent, "utf-8");
    }

    if (format === "md" && options.indexTocForChapters) {
      const chapterLines = tocEntries.map((e) => {
        const fileName = getChapterFileName(
          outputBasename,
          e.index,
          options,
          ".md"
        );
        return `- [Chapter ${e.index}${e.title ? ` - ${e.title}` : ""}](${CHAPTERS_DIR}/${fileName})`;
      });
      const indexBody =
        "## Table of contents\n\n" +
        chapterLines.join("\n") +
        "\n" +
        getExtractionFooter("md");
      fs.writeFileSync(mainFilePath, indexBody, "utf-8");
    }
  } else {
    let body = parts.join("\n\n");
    if (format === "md" && options.mdTocForChapters && tocEntries.length) {
      const tocLines = tocEntries.map((e) => {
        const label = `Chapter ${e.index}${e.title ? ` - ${e.title}` : ""}`;
        const headerText = `Chapter ${e.index}${e.title ? ` - ${e.title}` : ""}`;
        const slug = headerToAnchorSlug(headerText);
        return `- [${label}](#${slug})`;
      });
      const tocMd = "## Table of contents\n\n" + tocLines.join("\n");
      body = tocMd + "\n\n" + body;
    }
    body = body + getExtractionFooter(format);
    fs.writeFileSync(mainFilePath, body, "utf-8");
  }

  return {
    outputPath: mainFilePath,
    outputDir: bookDir,
    totalChapters: total,
  };
}

export function resolveOutputDir(customPath: string): string {
  const dir = customPath.trim()
    ? path.resolve(customPath)
    : path.join(process.cwd(), DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return path.resolve(dir);
}
