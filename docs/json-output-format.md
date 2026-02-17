# EPUB export JSON format (1.0)

This document describes the JSON output format produced when exporting an EPUB to JSON. It is intended as a stable, machine-readable standard for ebook content and metadata.

## Top-level structure

```ts
interface EpubExportJson {
  version: "1.0";
  metadata: EpubExportMetadata;
  toc: EpubExportTocEntry[];
  chapters: EpubExportChapter[];
  images: Record<string, EpubExportImage>;
}
```

- **version**: Format version string. Current version is `"1.0"`.
- **metadata**: Book metadata from the EPUB (title, author, language, etc.).
- **toc**: Table of contents entries, each with an id and a reference to a chapter.
- **chapters**: Ordered array of chapters, each with a prefixed id and content.
- **images**: When image extraction is enabled, object mapping image id (e.g. `img_<uuid>`) to image data (mimeType and base64 data).

## Metadata

```ts
interface EpubExportMetadata {
  title?: string;
  creator?: string;
  creatorFileAs?: string;
  publisher?: string;
  language?: string;
  subject?: string[];
  description?: string;
  date?: string;
  isbn?: string;
  uuid?: string;
  cover?: string;
  "belongs-to-collection"?: string;
  "collection-type"?: string;
  [key: string]: string | string[] | undefined;
}
```

Fields correspond to common EPUB/dublin-core metadata. All fields are optional depending on what the source EPUB provides.

## Table of contents

```ts
interface EpubExportTocEntry {
  title: string;
  level?: number;
  order?: number;
  id: string;
  chapterId: string;
}
```

- **title**: Display title of the TOC entry.
- **level**: Nesting level (e.g. 1 for top-level, 2 for nested).
- **order**: Reading order index when present.
- **id**: Unique id for this TOC entry (prefix `toc_` + UUID).
- **chapterId**: Id of the chapter this entry points to (prefix `chap_` + UUID). Use `chapters.find(c => c.id === tocEntry.chapterId)` to get the chapter.

## Chapters

```ts
interface EpubExportChapter {
  id: string;
  index: number;
  title: string;
  content?: string;
  file?: string;
}
```

- **id**: Unique id for the chapter (prefix `chap_` + UUID). Use as the canonical reference for the chapter.
- **index**: 1-based reading order index.
- **title**: Chapter title from the EPUB (spine/toc).
- **content**: Chapter text (plain text). Present in the main file when chapters are not split, or inside each chapter file when split. When images are extracted, image positions are marked with placeholders `{{img_<uuid>}}`; resolve each with the **images** object (in the main file).
- **file**: When “Split chapters to separate files” is enabled, the main JSON has **chapters** with **file** (e.g. `"chapters/book-chapter-1.json"`) and no **content**. Each referenced file is a JSON object `{ id, index, title, content }`. Same structure as MD/HTML: main file is the index, chapter files live under a `chapters/` directory.

## Images

When the “Include images” option is enabled for JSON output:

```ts
interface EpubExportImage {
  mimeType: string;
  data: string;
}
```

- **images**: Top-level object. Keys are image ids (prefix `img_` + UUID). Values have **mimeType** (e.g. `"image/png"`) and **data** (base64-encoded image bytes).
- In chapter **content**, an image is represented by the placeholder `{{img_<uuid>}}`. Replace each with the corresponding entry in **images** (e.g. render as inline image using the base64 data).

## ID prefixes

All ids use a type prefix plus a UUID (e.g. UUID v4):

- **chap\_** – chapter id (in `chapters[].id` and `toc[].chapterId`).
- **toc\_** – TOC entry id (`toc[].id`).
- **img\_** – image id (keys in **images** and placeholders in content).

## Usage

- Use **metadata** for display (title, creator, language) and cataloging.
- Use **toc** to build navigation; each entry’s **chapterId** references **chapters[].id**.
- Use **chapters[].id** as the canonical reference for a chapter.
- When **file** is set, load chapter content from that path (relative to the main JSON file). When **content** is set, it is inline.
- Prefer **content** for search, indexing, or plain-text display. When images are included, expand `{{img_<id>}}` using **images[id]**.

## Versioning

Future versions of this format may add optional top-level or per-chapter fields. Consumers should ignore unknown keys and treat missing optional fields as absent. The **version** field must be used to detect format revisions.
