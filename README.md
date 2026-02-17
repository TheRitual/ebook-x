# epub-x

Interactive Node.js CLI to extract book text from EPUB files to **plain text** (`.txt`), **Markdown** (`.md`), **JSON** (`.json`), or **HTML** (`.html`). Output is written to an `output/` directory with optional chapter titles, table of contents, and image extraction (MD/HTML).

**Requirements:** Node.js ≥ 20.

---

## Flow

1. **Main menu** – Convert an EPUB file, open Settings, or exit.
2. **File browser** – Navigate directories, go to parent (`..`), select an EPUB. Press **Esc** to cancel, **Ctrl/Cmd+S** to open Settings.
3. **Output format** – Plain text (`.txt`), Markdown (`.md`), JSON (`.json`), or HTML (`.html`) (default from settings).
4. **Output file name** – Base name without extension (default: source filename without extension).
5. If the output book directory already exists, you are asked whether to remove and recreate it.
6. Conversion runs using your saved settings; progress and output directory are shown.
7. **Settings** – Press **Esc** to return to the main menu. Interactive list in three groups:
   - **General:** Output path (directory browser), default format, split chapters, chapter file name style, em dash, sanitize whitespace, multiple newlines, keep TOC, restore defaults.
   - **TXT only:** Add chapter titles, chapter title style.
   - **MD only:** Include images, create TOC for MD files, create index file with TOC for chapters, add back link to chapters (when split + index TOC are on).
   - **HTML only:** HTML style – keep original (epub-like) or use custom theme (default: papyrus-like background, dark brown text, Lato/Roboto/Arial).
   - On a setting row, press **Space** to cycle the value (e.g. Yes ↔ No); **Enter** to confirm and return to the list. Stored in the system config directory (Linux: `~/.config/epub-x`, macOS: `~/Library/Application Support/epub-x`, Windows: `%LOCALAPPDATA%\\epub-x`).

**Output structure:** Each book is written under a directory named after the output basename. The main file is inside that directory. Example for basename `book` with images and split chapters (MD):

- `<output>/book/book.md` – index with table of contents (links to chapter files), or full book when not split
- `<output>/book/chapters/*.md` – one file per chapter (when split chapters is on)
- `<output>/book/__IMG__/*` – extracted images (MD, when include images is on)

---

## Install and run

**Global install:**

```bash
npm install -g .
# or, after publishing: npm install -g epub-x
epub-x
```

**Run without installing (JSR):**

```bash
npx jsr run @ritual/epub-x
```

**Local development:**

```bash
npm run build && npm run run
# or: npm run dev (watch) and in another terminal: npm run run
```

---

## Scripts

| Script                 | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `npm run build`        | Build CLI to `dist/` (Vite SSR).                                                      |
| `npm run dev`          | Build in watch mode.                                                                  |
| `npm run run`          | Run the built CLI (`node dist/cli.js`).                                               |
| `npm run typecheck`    | Run `tsc --noEmit`.                                                                   |
| `npm run lint`         | Run ESLint.                                                                           |
| `npm run lint:fix`     | ESLint with auto-fix.                                                                 |
| `npm run format`       | Prettier (write).                                                                     |
| `npm run format:check` | Prettier (check).                                                                     |
| `npm test`             | Run Vitest tests.                                                                     |
| `npm run test:example` | Run only example-book tests (requires `books/testbook.epub`; `books/` is gitignored). |
| `npm run test:watch`   | Vitest in watch mode.                                                                 |
| `npm run release`      | semantic-release (typically in CI).                                                   |

---

## Setup for publishing

1. Create a scope and package on [jsr.io/new](https://jsr.io/new). Adjust `jsr.json` and `package.json` if the scope is not `@ritual`.
2. In the JSR package settings, link this GitHub repository so CI can publish via OIDC.
3. Use [Conventional Commits](https://www.conventionalcommits.org/) so semantic-release can version correctly (e.g. `feat:`, `fix:`, `BREAKING CHANGE:`).

---

## Behaviour details

- **HTML entities** (e.g. `&#160;`, `&nbsp;`) are decoded so text and MD use normal characters.
- **Output path:** Configurable in Settings (directory browser). Default is `./output`.
- **Images (MD):** When enabled, images are extracted to `<book-dir>/__IMG__/` and referenced with relative paths from the `.md` file(s). When disabled, all image markdown is removed.
- **Chapter titles:** Uses the EPUB spine/toc; you can add _Chapter N_ (and optional title) in both formats.
- **Split chapters:** When on, each chapter is written to `<book-dir>/chapters/` with file names from the “Chapter file name” setting (same as output e.g. `book-chapter-42`, `chapter` e.g. `chapter-42`, or custom prefix).
- **Index TOC (MD):** When split chapters and “Create index file with TOC for chapters” are on, the main file is an index with links to each chapter file. “Add back link to chapters” adds a link back to the index in each chapter file.
- **TOC:** “Keep table of contents” uses the EPUB’s TOC at the start of the single file (when not splitting).
- **JSON output:** One `.json` file per book with `version`, `metadata`, `toc`, `chapters`, and `images`. Chapters have prefixed ids (`chap_<uuid>`), TOC entries reference chapters by `chapterId`, and optional images use `img_<uuid>` with placeholders `{{img_<uuid>}}` in content. See [docs/json-output-format.md](docs/json-output-format.md) for the format specification.
- **HTML output:** Preserves formatting; optional custom theme (background, text, heading and body fonts). “Keep original” uses minimal wrapper for epub-like appearance.

---

## Copyright and licence

Copyright (c) 2025 epub-x contributors.

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
