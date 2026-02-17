# epub-x

Interactive Node.js CLI to extract book text from EPUB files to plain text (`.txt`) or Markdown (`.md`). Output is written to an `output/` directory with optional chapter titles, table of contents, and image extraction for Markdown.

**Requirements:** Node.js ≥ 20.

---

## Flow

1. **Main menu** – Convert an EPUB file or exit.
2. **File browser** – Navigate directories, go to parent (`..`), select an EPUB. Press **Esc** to cancel and return to the menu. No list wrapping (fixed top/bottom).
3. **Output format** – Plain text (`.txt`) or Markdown (`.md`).
4. **Options (prompts):**
   - **Markdown only:** Extract and include images? If yes, images are saved under `output/<book-name>/__IMG__/` and linked with relative paths.
   - Add chapter titles (e.g. _Rozdział N_)? For `.txt` you can choose _separated lines_ (number then title on next line) or _inline_ (_Rozdział N - Title_).
   - Replace em dash (—) with hyphen (-)?
   - Sanitize whitespace (normalize to spaces and newlines)?
   - Keep table of contents in the extracted text?
   - **Markdown only:** Create a table of contents at the top of the MD file (per chapter)?
5. **Output file name** – Base name without extension.
6. Conversion runs; progress and output path are shown. You can run again or exit.

Output is written to `output/<name>.txt` or `output/<name>.md`. If images are included, `output/<name>/__IMG__/` contains the image files.

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
- **Images (MD):** When enabled, images are extracted to `output/<book-name>/__IMG__/` and referenced with relative paths from the `.md` file. When disabled, all image markdown is removed.
- **Chapter titles:** Uses the EPUB spine/toc; you can add _Rozdział N_ (and optional title) in both formats.
- **TOC:** “Keep table of contents” uses the EPUB’s TOC at the start of the file. “Create table of contents for the MD file” adds a generated _Spis rozdziałów_ at the top of the Markdown.

---

## Copyright and licence

Copyright (c) 2025 epub-x contributors.

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
