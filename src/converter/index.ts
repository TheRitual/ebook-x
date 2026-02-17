import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  sanitizeOutputBasename,
  sanitizeChapterFileNamePrefix,
} from "../utils/path-sanitize.js";
import { EPub } from "epub2";
import type {
  ConvertFormat,
  ConvertResult,
  ConvertOptions,
  EpubChapterInfo,
} from "./types.js";
import type {
  EpubExportJson,
  EpubExportMetadata,
  EpubExportTocEntry,
  EpubExportChapter,
  EpubExportImage,
} from "./json-output-types.js";
import {
  htmlToMarkdown,
  htmlToPlainText,
  applyPostOptions,
  removeImageLinksFromMarkdown,
  decodeHtmlEntities,
  getExtractionFooter,
  extractBodyInnerHtml,
} from "./utils.js";
import {
  buildStyledHtmlDocument,
  buildMinimalHtmlDocument,
} from "./utils/html-document.js";
import { loadHtmlStyle } from "../html-styles/index.js";
import { getExportT } from "../i18n/index.js";
import type { LocaleId } from "../i18n/types.js";

function wrapHtmlBody(content: string, options: ConvertOptions): string {
  const style = options.htmlStyle ?? "none";
  if (style === "none") return buildMinimalHtmlDocument(content);
  const styleDef = loadHtmlStyle(options.htmlStyleId ?? "default");
  if (!styleDef) return buildMinimalHtmlDocument(content);
  return buildStyledHtmlDocument(content, styleDef);
}

const DEFAULT_OUTPUT_DIR = "output";
const IMG_SUBDIR = "__img__";
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
      const prefix = sanitizeChapterFileNamePrefix(
        options.chapterFileNameCustomPrefix
      );
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

function pathWithoutFirstSegment(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length > 1 ? parts.slice(1).join("/") : p;
}

function manifestIdForImage(
  resolved: string,
  hrefToId: Map<string, string>
): string | undefined {
  return (
    hrefToId.get(resolved) ??
    hrefToId.get(pathWithoutFirstSegment(resolved)) ??
    hrefToId.get(path.basename(resolved))
  );
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
  const esc = IMG_SUBDIR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return md.replace(
    new RegExp(`\\]\\(\\s*${esc}/`, "g"),
    `](../${IMG_SUBDIR}/`
  );
}

function imagePathsForChapterFileHtml(html: string): string {
  const esc = IMG_SUBDIR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html
    .replace(new RegExp(`src="${esc}/`, "g"), `src="../${IMG_SUBDIR}/`)
    .replace(new RegExp(`src='${esc}/`, "g"), `src='../${IMG_SUBDIR}/`);
}

function headerToAnchorSlug(headerText: string): string {
  return headerText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

interface EpubMetadataLike {
  publisher?: string;
  language?: string;
  title?: string;
  subject?: string[];
  description?: string;
  creator?: string;
  creatorFileAs?: string;
  date?: string;
  ISBN?: string;
  UUID?: string;
  cover?: string;
  "belongs-to-collection"?: string;
  "collection-type"?: string;
  [key: string]: string | string[] | undefined;
}

function buildJsonMetadata(epub: {
  metadata: EpubMetadataLike;
}): EpubExportMetadata {
  const m = epub.metadata;
  const out: EpubExportMetadata = {};
  if (m.title !== undefined) out.title = String(m.title);
  if (m.creator !== undefined) out.creator = String(m.creator);
  if (m.creatorFileAs !== undefined)
    out.creatorFileAs = String(m.creatorFileAs);
  if (m.publisher !== undefined) out.publisher = String(m.publisher);
  if (m.language !== undefined) out.language = String(m.language);
  if (m.subject !== undefined)
    out.subject = Array.isArray(m.subject) ? m.subject : [String(m.subject)];
  if (m.description !== undefined) out.description = String(m.description);
  if (m.date !== undefined) out.date = String(m.date);
  if (m.ISBN !== undefined) out.isbn = String(m.ISBN);
  if (m.UUID !== undefined) out.uuid = String(m.UUID);
  if (m.cover !== undefined) out.cover = String(m.cover);
  if (m["belongs-to-collection"] !== undefined)
    out["belongs-to-collection"] = String(m["belongs-to-collection"]);
  if (m["collection-type"] !== undefined)
    out["collection-type"] = String(m["collection-type"]);
  return out;
}

interface TocElementLike {
  title?: string;
  level?: number;
  order?: number;
  href?: string;
  id?: string;
}

function buildJsonToc(
  epub: { toc: TocElementLike[] },
  chapterIds: string[],
  indicesToProcess: number[],
  flow: TocElementLike[]
): EpubExportTocEntry[] {
  const toc = epub.toc;
  if (!toc?.length) {
    return indicesToProcess.map((_, idx) => ({
      title:
        (flow[indicesToProcess[idx]!]?.title ?? "").trim() ||
        `Chapter ${idx + 1}`,
      order: idx + 1,
      id: `toc_${crypto.randomUUID()}`,
      chapterId: chapterIds[idx]!,
    }));
  }
  const indexToChapterId = new Map<number, string>();
  indicesToProcess.forEach((flowIndex, idx) => {
    indexToChapterId.set(flowIndex, chapterIds[idx]!);
  });
  const out: EpubExportTocEntry[] = [];
  for (let i = 0; i < toc.length; i++) {
    const t = toc[i]!;
    const flowIdx = flow.findIndex((f) => f.href === t.href || f.id === t.id);
    const chapterId =
      flowIdx !== -1 && indexToChapterId.has(flowIdx)
        ? indexToChapterId.get(flowIdx)
        : undefined;
    if (chapterId === undefined) continue;
    const title = (t.title ?? "").trim() || `Chapter ${i + 1}`;
    const entry: EpubExportTocEntry = {
      title,
      id: `toc_${crypto.randomUUID()}`,
      chapterId,
    };
    if (t.level !== undefined) entry.level = t.level;
    if (t.order !== undefined) entry.order = t.order;
    else entry.order = i + 1;
    out.push(entry);
  }
  return out;
}

export async function convertEpub(
  epubPath: string,
  outputBasename: string,
  format: ConvertFormat,
  options: ConvertOptions,
  outputDir: string,
  formatSubdir?: string,
  flatOutput?: boolean
): Promise<ConvertResult> {
  const exportT = getExportT((options.exportLocale ?? "en") as LocaleId);
  const epub = await EPub.createAsync(epubPath);
  const flow = epub.flow;
  const chapterIndicesSet =
    options.chapterIndices && options.chapterIndices.length > 0
      ? new Set(options.chapterIndices)
      : null;
  const indicesToProcess =
    chapterIndicesSet === null
      ? flow.map((_: { id?: string }, i: number) => i)
      : options
          .chapterIndices!.filter((n) => n >= 1 && n <= flow.length)
          .map((n) => n - 1)
          .sort((a, b) => a - b);
  const total = indicesToProcess.length;

  const safeBasename = sanitizeOutputBasename(outputBasename);
  const bookDir =
    flatOutput === true
      ? path.resolve(outputDir)
      : formatSubdir !== undefined
        ? path.join(outputDir, safeBasename, formatSubdir)
        : path.join(outputDir, safeBasename);
  fs.mkdirSync(bookDir, { recursive: true });

  if (format === "json") {
    const metadata = buildJsonMetadata(epub);
    const chapterIds: string[] = [];
    const chapters: EpubExportChapter[] = [];
    const imagesMap = new Map<string, EpubExportImage>();
    const manifestIdToImgId = new Map<string, string>();
    interface FlowItem {
      id?: string;
      href?: string;
      title?: string;
    }
    interface ManifestItem {
      href?: string;
      "media-type"?: string;
      mediaType?: string;
    }
    let hrefToIdJson: Map<string, string> | null = null;
    let imgDirJson: string | null = null;
    if (options.includeImages) {
      imgDirJson = path.join(bookDir, IMG_SUBDIR);
      fs.mkdirSync(imgDirJson, { recursive: true });
      hrefToIdJson = new Map<string, string>();
      for (const [id, item] of Object.entries(epub.manifest) as [
        string,
        ManifestItem,
      ][]) {
        const href = item?.href;
        const mt = item?.["media-type"] ?? item?.mediaType;
        if (href && isImageManifestItem(href, mt)) {
          const norm = path.normalize(href).replace(/\\/g, "/");
          hrefToIdJson.set(norm, id);
          const withoutFirst = pathWithoutFirstSegment(norm);
          if (withoutFirst !== norm) hrefToIdJson.set(withoutFirst, id);
        }
      }
    }
    let jsonDisplayIdx = 0;
    for (const i of indicesToProcess) {
      const chapter = flow[i] as FlowItem | undefined;
      const id = chapter?.id;
      if (!id) continue;
      const chapterId = `chap_${crypto.randomUUID()}`;
      chapterIds.push(chapterId);
      const raw = await epub.getChapterRawAsync(id);
      let bodyHtml = extractBodyInnerHtml(raw);
      bodyHtml = decodeHtmlEntities(bodyHtml);
      if (!options.includeImages) {
        bodyHtml = bodyHtml.replace(/<img[^>]*>/gi, "");
      } else if (hrefToIdJson && imgDirJson) {
        const chapterHref = chapter?.href ?? "";
        const imgTagRe = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        const matches: { full: string; src: string; index: number }[] = [];
        let m: RegExpExecArray | null;
        while ((m = imgTagRe.exec(bodyHtml)) !== null) {
          matches.push({ full: m[0]!, src: m[1]!, index: m.index });
        }
        for (let k = matches.length - 1; k >= 0; k--) {
          const { full, src } = matches[k]!;
          const resolved = resolveChapterRelative(chapterHref, src);
          const manifestId = hrefToIdJson
            ? manifestIdForImage(resolved, hrefToIdJson)
            : undefined;
          if (!manifestId) continue;
          let imgId = manifestIdToImgId.get(manifestId);
          if (!imgId) {
            imgId = `img_${crypto.randomUUID()}`;
            manifestIdToImgId.set(manifestId, imgId);
            try {
              const [buf, mime] = await epub.getImageAsync(manifestId);
              const extImg = mime?.startsWith("image/")
                ? (mime.split("/")[1] ?? "png")
                : "png";
              const safeName = `${manifestId.replace(/[^a-zA-Z0-9_-]/g, "_")}.${extImg}`;
              const outPath = path.join(imgDirJson, safeName);
              fs.writeFileSync(outPath, buf);
              imagesMap.set(imgId, { url: `${IMG_SUBDIR}/${safeName}` });
            } catch {
              continue;
            }
          }
          bodyHtml =
            bodyHtml.slice(0, matches[k]!.index) +
            `\${{${imgId}}}` +
            bodyHtml.slice(matches[k]!.index + full.length);
        }
      }
      let content = htmlToPlainText(bodyHtml);
      content = applyPostOptions(content, {
        emDashToHyphen: options.emDashToHyphen,
        sanitizeWhitespace: options.sanitizeWhitespace,
        newlinesHandling: options.newlinesHandling,
      });
      const chapterNum = chapters.length + 1;
      const title =
        (chapter?.title?.trim() ?? "") || exportT.formatChapter(chapterNum);
      chapters.push({
        id: chapterId,
        index: chapterNum,
        title,
        content,
      });
      jsonDisplayIdx++;
      process.stdout.write(
        `\rConverting chapter ${jsonDisplayIdx}/${total}...`
      );
    }
    process.stdout.write("\n");
    const toc = buildJsonToc(epub, chapterIds, indicesToProcess, flow);
    const mainFilePath = path.join(bookDir, safeBasename + ".json");
    if (options.splitChapters && chapters.length > 0) {
      const chaptersDir = path.join(bookDir, CHAPTERS_DIR);
      fs.mkdirSync(chaptersDir, { recursive: true });
      const chapterRefs: EpubExportChapter[] = [];
      for (const ch of chapters) {
        const fileName = getChapterFileName(
          safeBasename,
          ch.index,
          options,
          ".json"
        );
        const chapterPath = path.join(chaptersDir, fileName);
        fs.writeFileSync(
          chapterPath,
          JSON.stringify(
            {
              id: ch.id,
              index: ch.index,
              title: ch.title,
              content: ch.content,
            },
            null,
            2
          ),
          "utf-8"
        );
        chapterRefs.push({
          id: ch.id,
          index: ch.index,
          title: ch.title,
          file: `${CHAPTERS_DIR}/${fileName}`,
        });
      }
      const exportJson: EpubExportJson = {
        version: "1.0",
        metadata,
        toc,
        chapters: chapterRefs,
        ...(options.includeImages && imagesMap.size > 0
          ? { images: Object.fromEntries(imagesMap) }
          : {}),
      };
      fs.writeFileSync(
        mainFilePath,
        JSON.stringify(exportJson, null, 2),
        "utf-8"
      );
    } else {
      const exportJson: EpubExportJson = {
        version: "1.0",
        metadata,
        toc,
        chapters,
        ...(options.includeImages && imagesMap.size > 0
          ? { images: Object.fromEntries(imagesMap) }
          : {}),
      };
      fs.writeFileSync(
        mainFilePath,
        JSON.stringify(exportJson, null, 2),
        "utf-8"
      );
    }
    return {
      outputPath: mainFilePath,
      outputDir: bookDir,
      totalChapters: chapters.length,
    };
  }

  const imgDir =
    (format === "md" || format === "html") && options.includeImages
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
      const withoutFirst = pathWithoutFirstSegment(norm);
      if (withoutFirst !== norm) hrefToId.set(withoutFirst, id);
    }
  }

  const savedImages = new Map<string, string>();
  const srcToNewPath = new Map<string, string>();

  const tocEntries: { index: number; title: string }[] = [];
  const parts: string[] = [];

  if (
    options.keepToc &&
    !options.splitChapters &&
    epub.toc?.length &&
    chapterIndicesSet === null
  ) {
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
          ? `## ${exportT.tableOfContents}\n\n` + tocLines.join("\n")
          : `${exportT.tableOfContents}\n\n` + tocLines.join("\n")
      );
    }
  }

  const ext = format === "md" ? ".md" : format === "html" ? ".html" : ".txt";

  let displayIdx = 0;
  for (const i of indicesToProcess) {
    const chapter = flow[i];
    const id = chapter?.id;
    if (!id) continue;

    const chapterTitle = chapter?.title?.trim() ?? "";
    const chapterNum = i + 1;

    const raw = await epub.getChapterRawAsync(id);
    const chapterHref = chapter?.href ?? "";

    if ((format === "md" || format === "html") && options.includeImages) {
      const srcs = extractImgSrcs(raw);
      for (const src of srcs) {
        const resolved = resolveChapterRelative(chapterHref, src);
        const manifestId = manifestIdForImage(resolved, hrefToId);
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

    let content: string;
    if (format === "html") {
      content = extractBodyInnerHtml(raw);
      content = decodeHtmlEntities(content);
      if (!options.includeImages) {
        content = content.replace(/<img[^>]*>/gi, "");
      } else if (srcToNewPath.size) {
        for (const [src, newPath] of srcToNewPath) {
          const esc = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          content = content.replace(
            new RegExp(`(<img[^>]+src=)(["'])${esc}(["'])`, "gi"),
            `$1$2${newPath}$3`
          );
        }
      }
      if (options.addChapterTitles) {
        const titleLine = `<h3>${exportT.formatChapter(chapterNum, chapterTitle)}</h3>`;
        content = titleLine + "\n\n" + content;
      }
    } else {
      content = format === "md" ? htmlToMarkdown(raw) : htmlToPlainText(raw);
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
            ? `### ${exportT.formatChapter(chapterNum, chapterTitle)}`
            : options.chapterTitleStyleTxt === "inline"
              ? exportT.formatChapter(chapterNum, chapterTitle)
              : chapterTitle
                ? `${exportT.formatChapter(chapterNum)}\n\n${chapterTitle}`
                : exportT.formatChapter(chapterNum);
        content = titleLine + "\n\n" + content;
      }
    }

    tocEntries.push({ index: chapterNum, title: chapterTitle });
    parts.push(content);
    displayIdx++;
    process.stdout.write(`\rConverting chapter ${displayIdx}/${total}...`);
  }
  process.stdout.write("\n");

  const mainFilePath = path.join(bookDir, safeBasename + ext);

  if (options.splitChapters) {
    const chaptersDir = path.join(bookDir, CHAPTERS_DIR);
    fs.mkdirSync(chaptersDir, { recursive: true });

    for (let i = 0; i < parts.length; i++) {
      const chapterNum = i + 1;
      const fileName = getChapterFileName(
        safeBasename,
        chapterNum,
        options,
        ext
      );
      const chapterPath = path.join(chaptersDir, fileName);
      let chapterContent = parts[i]!;

      const prevFileName =
        i > 0 && options.addPrevLinkToChapters
          ? getChapterFileName(safeBasename, i, options, ext)
          : null;
      const nextFileName =
        i < parts.length - 1 && options.addNextLinkToChapters
          ? getChapterFileName(safeBasename, chapterNum + 1, options, ext)
          : null;
      const tocLinkMd =
        format === "md" &&
        options.indexTocForChapters &&
        options.addBackLinkToChapters
          ? `[${exportT.tocLink}](../${safeBasename}.md)`
          : "";
      const tocLinkHtml =
        format === "html" && options.addBackLinkToChapters
          ? `<a class="chapter-nav-link" href="../${safeBasename}.html">${exportT.tocLink}</a>`
          : "";

      if (format === "md") {
        chapterContent = imagePathsForChapterFile(chapterContent);
        const navParts: string[] = [];
        if (prevFileName)
          navParts.push(`[${exportT.previous}](${prevFileName})`);
        if (tocLinkMd) navParts.push(tocLinkMd);
        if (nextFileName) navParts.push(`[${exportT.next}](${nextFileName})`);
        if (navParts.length)
          chapterContent =
            chapterContent + "\n\n" + navParts.join(" | ") + "\n";
      }
      if (format === "html") {
        chapterContent = imagePathsForChapterFileHtml(chapterContent);
        const navParts: string[] = [];
        if (prevFileName)
          navParts.push(
            `<a class="chapter-nav-link" href="${prevFileName}">${exportT.previous}</a>`
          );
        if (tocLinkHtml) navParts.push(tocLinkHtml);
        if (nextFileName)
          navParts.push(
            `<a class="chapter-nav-link" href="${nextFileName}">${exportT.next}</a>`
          );
        if (navParts.length)
          chapterContent =
            chapterContent +
            '\n<p class="chapter-nav">' +
            navParts.join(" | ") +
            "</p>\n";
        chapterContent = chapterContent + getExtractionFooter("html");
        const wrapped = wrapHtmlBody(chapterContent, options);
        fs.writeFileSync(chapterPath, wrapped, "utf-8");
      } else {
        chapterContent = chapterContent + getExtractionFooter(format);
        fs.writeFileSync(chapterPath, chapterContent, "utf-8");
      }
    }

    if (format === "md" && options.indexTocForChapters) {
      const chapterLines = tocEntries.map((e) => {
        const fileName = getChapterFileName(
          safeBasename,
          e.index,
          options,
          ".md"
        );
        return `- [${exportT.formatChapter(e.index, e.title)}](${CHAPTERS_DIR}/${fileName})`;
      });
      const indexBody =
        `## ${exportT.tableOfContents}\n\n` +
        chapterLines.join("\n") +
        "\n" +
        getExtractionFooter("md");
      fs.writeFileSync(mainFilePath, indexBody, "utf-8");
    }
    if (format === "html") {
      const chapterLines = tocEntries.map((e) => {
        const fileName = getChapterFileName(
          safeBasename,
          e.index,
          options,
          ".html"
        );
        return `<li><a class="toc-link" href="${CHAPTERS_DIR}/${fileName}">${exportT.formatChapter(e.index, e.title)}</a></li>`;
      });
      const indexBody =
        `<h2>${exportT.tableOfContents}</h2>\n<ul>\n` +
        chapterLines.join("\n") +
        "\n</ul>\n" +
        getExtractionFooter("html");
      const wrapped = wrapHtmlBody(indexBody, options);
      fs.writeFileSync(mainFilePath, wrapped, "utf-8");
    }
  } else {
    let body = parts.join("\n\n");
    if (format === "md" && options.mdTocForChapters && tocEntries.length) {
      const tocLines = tocEntries.map((e) => {
        const label = exportT.formatChapter(e.index, e.title);
        const headerText = exportT.formatChapter(e.index, e.title);
        const slug = headerToAnchorSlug(headerText);
        return `- [${label}](#${slug})`;
      });
      const tocMd = `## ${exportT.tableOfContents}\n\n` + tocLines.join("\n");
      body = tocMd + "\n\n" + body;
    }
    if (format === "html" && options.mdTocForChapters && tocEntries.length) {
      const tocLines = tocEntries.map((e) => {
        const label = exportT.formatChapter(e.index, e.title);
        const headerText = exportT.formatChapter(e.index, e.title);
        const slug = headerToAnchorSlug(headerText);
        return `<li><a class="toc-link" href="#${slug}">${label}</a></li>`;
      });
      body =
        `<h2 class="toc-title">${exportT.tableOfContents}</h2>\n<ul class="toc-list">\n` +
        tocLines.join("\n") +
        "\n</ul>\n\n" +
        body;
    }
    body = body + getExtractionFooter(format === "html" ? "html" : format);
    if (format === "html") {
      const wrapped = wrapHtmlBody(body, options);
      fs.writeFileSync(mainFilePath, wrapped, "utf-8");
    } else {
      fs.writeFileSync(mainFilePath, body, "utf-8");
    }
  }

  return {
    outputPath: mainFilePath,
    outputDir: bookDir,
    totalChapters: total,
  };
}

export async function getEpubChapters(
  epubPath: string
): Promise<EpubChapterInfo[]> {
  const epub = await EPub.createAsync(epubPath);
  const flow = epub.flow;
  return flow.map((ch: { title?: string }, i: number) => ({
    index: i + 1,
    title: (ch?.title?.trim() ?? "") || `Chapter ${i + 1}`,
  }));
}

export function resolveOutputDir(customPath: string): string {
  const dir = customPath.trim()
    ? path.resolve(customPath)
    : path.join(process.cwd(), DEFAULT_OUTPUT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  return path.resolve(dir);
}
