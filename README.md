# @ritual/ebook-x

Interactive Node.js CLI to extract book text from EPUB files to **plain text** (`.txt`), **Markdown** (`.md`), **JSON** (`.json`), or **HTML** (`.html`). Output is written to an `output/` directory with optional chapter titles, table of contents, and image extraction (MD/HTML).

**Requirements:** Node.js ≥ 20.

---

## Flow

1. **Main menu** – Convert EPUB file(s), open Settings, How to, or exit.
2. **File browser** – Navigate directories, go to parent (`..`), select one or more EPUBs. Press **Esc** to cancel, **Ctrl/Cmd+S** to open Settings.
3. **After selection** – Choose: Extract, Select formats, View selected files (per-file output name, chapters, images), Change settings, or Back to file browser.
4. **Output formats** – Multi-select: plain text (`.txt`), Markdown (`.md`), JSON (`.json`), HTML (`.html`). Default comes from settings (at least one required).
5. **Output file name** – Per file: base name without extension (default: source filename without extension). Editable in View selected files.
6. If the output book directory already exists, you are asked whether to remove and recreate it.
7. Conversion runs using your saved settings; progress and output directory are shown.
8. **Settings** – Press **Esc** to return to the main menu. Interactive list:
   - **General:** Output path (directory browser), default formats (one or more), theme (CLI colors and frame style), app language, export language (for converted text: TOC labels, next/previous links), chapter file name style, custom prefix, add chapter titles (TXT), chapter title style (TXT), em dash → hyphen, sanitize whitespace, newlines handling, restore defaults.
   - **MD / HTML:** Split chapters, keep TOC, TOC in file, index with TOC, add back / next / previous link to chapters, include images.
   - **HTML only:** HTML style (Pure HTML or Styled). When Styled, choose or edit an HTML style (built-in read-only; create a copy to customize; stored in config `html-styles/`).
   - **JSON:** Split chapters, include images.
   - On a setting row, press **Space** to cycle the value (e.g. Yes ↔ No); **Enter** to confirm and return to the list. Stored in the system config directory (Linux: `~/.config/ebook-x`, macOS: `~/Library/Application Support/ebook-x`, Windows: `%LOCALAPPDATA%\\ebook-x`). Custom themes in `themes/`, HTML styles in `html-styles/`.

**Output structure:** Each book is written under a directory named after the output basename. The main file is inside that directory. Example for basename `book` with images and split chapters (MD):

- `<output>/book/book.md` – index with table of contents (links to chapter files), or full book when not split
- `<output>/book/chapters/*.md` – one file per chapter (when split chapters is on)
- `<output>/book/__img__/*` – extracted images (MD/HTML, when include images is on)

---

## Install and run

**Global install:**

```bash
npm install -g .
# or, after publishing: npm install -g @ritual/ebook-x
ebook-x
```

**Run without installing (JSR):**

```bash
npx jsr run @ritual/ebook-x
```

**Local development:**

```bash
npm run build && npm run run
# or: npm run dev (watch) and in another terminal: npm run run
```

---

## Use as a library

The package exports functions to extract EPUB to a single format. Each function takes one options object (or an array of objects for batch) and returns a promise of the result(s).

**Required options:** `sourcePath`, `outputPath`, `outputName`. All other options are optional (sensible defaults: no images, single file, no split chapters).

**Example – extract to Markdown with defaults (no images, one file):**

```js
import { eXepub2md } from "@ritual/ebook-x";

const result = await eXepub2md({
  sourcePath: "/home/user/Documents/myBook.epub",
  outputPath: "/home/user/Documents/books",
  outputName: "MyExtractedBook",
});
// Creates: /home/user/Documents/books/MyExtractedBook/MyExtractedBook.md
console.log(result.outputPath);
```

**Example – output file directly in the folder (no subdirectory):**

```js
await eXepub2md({
  sourcePath: "/home/user/Documents/myBook.epub",
  outputPath: "/home/user/Documents/books",
  outputName: "MyExtractedBook",
  flatOutput: true,
});
// Creates: /home/user/Documents/books/MyExtractedBook.md
```

**Example – with images and chapter titles:**

```js
await eXepub2md({
  sourcePath: "/path/to/book.epub",
  outputPath: "/path/to/out",
  outputName: "book",
  includeImages: true,
  addChapterTitles: true,
});
```

**Available functions:** `eXepub2txt`, `eXepub2md`, `eXepub2html`, `eXepub2json`. Each accepts `ExtractOptions | ExtractOptions[]` and returns `Promise<ExtractResult | ExtractResult[]>`.

**Batch – multiple books:**

```js
const results = await eXepub2md([
  { sourcePath: "/path/a.epub", outputPath: "/out", outputName: "a" },
  { sourcePath: "/path/b.epub", outputPath: "/out", outputName: "b" },
]);
```

**Optional options** (same as converter settings): `flatOutput`, `includeImages`, `addChapterTitles`, `chapterTitleStyleTxt`, `emDashToHyphen`, `sanitizeWhitespace`, `newlinesHandling`, `keepToc`, `mdTocForChapters`, `splitChapters`, `chapterFileNameStyle`, `chapterFileNameCustomPrefix`, `indexTocForChapters`, `addBackLinkToChapters`, `addNextLinkToChapters`, `addPrevLinkToChapters`, `htmlStyle`, `htmlStyleId`, `exportLocale`, `chapterIndices`.

---

## Command-line scripts (one-shot extract)

After `npm run build`, you can run format-specific extract with a source path. Default: output directory = directory of the source file, output name = source filename without extension, one file in a subdirectory, no images.

```bash
npm run eXepub2md -- <source-file-path>
```

**Examples:**

```bash
npm run eXepub2md -- ./myBook.epub
# Creates ./myBook/myBook.md (no images)

npm run eXepub2md -- ./myBook.epub --output-path=./out --output-name=MyBook
# Creates ./out/MyBook/MyBook.md

npm run eXepub2md -- ./myBook.epub --flat
# Creates ./myBook.md in the same directory as the source

npm run eXepub2md -- ./myBook.epub --include-images
# Same as first, but with images extracted
```

**Optional arguments:** `--output-path=DIR`, `--output-name=NAME`, `--flat`, `--include-images`. Same commands exist for `eXepub2txt`, `eXepub2html`, `eXepub2json`.

---

## Scripts

| Script                 | Description                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`        | Build CLI to `dist/` (Vite SSR).                                                                                             |
| `npm run dev`          | Build in watch mode.                                                                                                         |
| `npm run run`          | Run the built CLI (`node dist/cli.js`).                                                                                      |
| `npm run typecheck`    | Run `tsc --noEmit`.                                                                                                          |
| `npm run lint`         | Run ESLint.                                                                                                                  |
| `npm run lint:fix`     | ESLint with auto-fix.                                                                                                        |
| `npm run format`       | Prettier (write).                                                                                                            |
| `npm run format:check` | Prettier (check).                                                                                                            |
| `npm test`             | Run Vitest tests.                                                                                                            |
| `npm run test:example` | Run only example-book tests (requires `books/testbook.epub`; `books/` is gitignored).                                        |
| `npm run test:watch`   | Vitest in watch mode.                                                                                                        |
| `npm run release`      | semantic-release (typically in CI).                                                                                          |
| `npm run eXepub2txt`   | Extract one EPUB to plain text (args: source path, optional `--output-path`, `--output-name`, `--flat`, `--include-images`). |
| `npm run eXepub2md`    | Extract one EPUB to Markdown (same optional args).                                                                           |
| `npm run eXepub2html`  | Extract one EPUB to HTML (same optional args).                                                                               |
| `npm run eXepub2json`  | Extract one EPUB to JSON (same optional args).                                                                               |

---

## Setup for publishing

1. Create a scope and package on [jsr.io/new](https://jsr.io/new). Adjust `jsr.json` and `package.json` if the scope is not `@ritual`.
2. In the JSR package settings, link this GitHub repository so CI can publish via OIDC.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) so semantic-release can version correctly (e.g. `feat:`, `fix:`, `BREAKING CHANGE:`).

---

## Behaviour details

- **HTML entities** (e.g. `&#160;`, `&nbsp;`) are decoded so text and MD use normal characters.
- **Output path:** Configurable in Settings (directory browser). Default is `./output`.
- **Images (MD):** When enabled, images are extracted to `<book-dir>/__img__/` and referenced with relative paths from the `.md` file(s). When disabled, all image markdown is removed.
- **Chapter titles:** Uses the EPUB spine/toc; you can add _Chapter N_ (and optional title) in both formats.
- **Split chapters:** When on, each chapter is written to `<book-dir>/chapters/` with file names from the “Chapter file name” setting (same as output e.g. `book-chapter-42`, `chapter` e.g. `chapter-42`, or custom prefix).
- **Index TOC (MD/HTML):** When split chapters and “Index with TOC” are on, the main file is an index with links to each chapter file. “TOC link” adds a link back to the index in each chapter; “Next link” / “Previous link” add navigation between chapters.
- **TOC:** “Keep table of contents” uses the EPUB’s TOC at the start of the single file (when not splitting).
- **JSON output:** One `.json` file per book with `version`, `metadata`, `toc`, `chapters`, and `images`. Chapters have prefixed ids (`chap_<uuid>`), TOC entries reference chapters by `chapterId`, and optional images use `img_<uuid>` with placeholders `{{img_<uuid>}}` in content. See [docs/json-output-format.md](docs/json-output-format.md) for the format specification.
- **HTML output:** Preserves formatting. Pure HTML uses a minimal wrapper with no CSS. Styled uses the selected HTML style: one JSON file per style, with CSS classes for body, chapter title, TOC title, TOC list, TOC link, content, extraction footer, extraction footer link, chapter navigation, and chapter navigation link. Footer and chapter nav (previous / TOC / next) links use the theme colours and have no underline by default; they show an underline on hover. Built-in styles are read-only; user styles are stored in the config directory (`html-styles/`). You can edit each class as key–value CSS properties (validated, no injection).
- **Themes:** CLI appearance (colors, frame style) is configurable. Built-in themes plus custom themes stored in config `themes/`.
- **Languages:** App language sets UI locale (menus, hints); export language sets the language of generated text (TOC headings, “Next”/“Previous” links). Supported: English, Polish, German, French, Spanish, Italian, Portuguese, Russian, Chinese, Japanese. “System” uses the OS locale.

---

## Copyright and licence

Copyright (c) 2025 ebook-x contributors.

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
