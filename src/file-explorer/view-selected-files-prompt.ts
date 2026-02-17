import path from "node:path";
import readline from "node:readline";
import process from "node:process";
import type { SelectedFile } from "./selected-file-types.js";
import type { OutputFormat } from "../menus/types.js";
import type { AppSettings } from "../settings/types.js";
import { getDefaultIncludeImages } from "./utils/default-include-images.js";
import { promptPerFileSettings } from "./per-file-settings-prompt.js";
import { t } from "../i18n/index.js";
import { exitNicely } from "../exit.js";
import {
  styleMessage,
  styleHintTips,
  styleSelectedRow,
  styleSectionBold,
  styleSettingValue,
} from "../menus/colors.js";
import { getCurrentTheme } from "../themes/context.js";
import {
  clearScreen,
  getFrameWidth,
  getSelectPageSize,
  PAGE_JUMP,
  getPlainLength,
  truncateToPlainLength,
  sliceByPlainRange,
} from "../menus/utils.js";

type Widths6 = [number, number, number, number, number, number];

const MIN_COL_SOURCE = 6;
const MIN_COL_OUTPUT = 6;
const MIN_COL_FORMATS = 7;
const MIN_COL_CH = 8;
const MIN_COL_IMG = 6;
const MIN_COL_SPLIT = 5;

function padToPlainLength(content: string, plainWidth: number): string {
  const n = getPlainLength(content);
  if (n >= plainWidth) return content;
  return content + " ".repeat(plainWidth - n);
}

function getSplitForFormats(
  formats: OutputFormat[],
  settings: AppSettings
): boolean {
  for (const fmt of formats) {
    if (fmt === "md" && settings.formats.md.splitChapters) return true;
    if (fmt === "html" && settings.formats.html.splitChapters) return true;
    if (fmt === "json" && settings.formats.json.splitChapters) return true;
  }
  return false;
}

const TABLE_STRUCTURE_FIXED = 19;

function computeMinColumnWidths(
  files: SelectedFile[],
  formats: OutputFormat[]
): Widths6 {
  let wSource = MIN_COL_SOURCE;
  let wOutput = MIN_COL_OUTPUT;
  let wFormats = MIN_COL_FORMATS;
  const formatsStr = formats.join(", ");
  for (const f of files) {
    const source = path.basename(f.path);
    wSource = Math.max(wSource, source.length);
    wOutput = Math.max(wOutput, f.outputBasename.length);
    wFormats = Math.max(wFormats, formatsStr.length);
  }
  const wCh = Math.max(
    MIN_COL_CH,
    "All".length,
    getPlainLength(t("col_chapters"))
  );
  const wImg = Math.max(
    MIN_COL_IMG,
    t("yes").length,
    t("no").length,
    getPlainLength(t("col_images"))
  );
  const wSplit = Math.max(
    MIN_COL_SPLIT,
    t("yes").length,
    t("no").length,
    getPlainLength(t("col_split"))
  );
  return [wSource, wOutput, wFormats, wCh, wImg, wSplit];
}

function computeColumnWidths(
  files: SelectedFile[],
  formats: OutputFormat[],
  innerWidth: number
): Widths6 {
  const min = computeMinColumnWidths(files, formats);
  const totalMin =
    min[0]! +
    min[1]! +
    min[2]! +
    min[3]! +
    min[4]! +
    min[5]! +
    TABLE_STRUCTURE_FIXED;
  if (innerWidth <= totalMin) return min;
  const extra = innerWidth - totalMin;
  const weights = [2, 2, 1, 1, 1, 1] as const;
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const out: Widths6 = [...min];
  for (let i = 0; i < 6; i++) {
    out[i] = min[i]! + Math.floor((extra * weights[i]!) / sumWeights);
  }
  let assigned = out.reduce((a, b) => a + b, 0) + TABLE_STRUCTURE_FIXED;
  let j = 0;
  while (assigned < innerWidth && j < 6) {
    out[j] = out[j]! + 1;
    assigned++;
    j = (j + 1) % 6;
  }
  return out;
}

function buildTableRow(
  cells: string[],
  f: ReturnType<typeof getCurrentTheme>["frameStyle"]
): string {
  return (
    f.vertical + " " + cells.join(" " + f.vertical + " ") + " " + f.vertical
  );
}

function buildTableDivider(
  widths: Widths6,
  f: ReturnType<typeof getCurrentTheme>["frameStyle"]
): string {
  const [wS, wO, wF, wC, wI, wSp] = widths;
  return (
    f.dividerLeft +
    f.horizontal.repeat(wS + 2) +
    f.dividerCross +
    f.horizontal.repeat(wO + 2) +
    f.dividerCross +
    f.horizontal.repeat(wF + 2) +
    f.dividerCross +
    f.horizontal.repeat(wC + 2) +
    f.dividerCross +
    f.horizontal.repeat(wI + 2) +
    f.dividerCross +
    f.horizontal.repeat(wSp + 2) +
    f.dividerRight
  );
}

function sliceForWidth(
  line: string,
  hScroll: number,
  innerWidth: number
): string {
  const truncated = truncateToPlainLength(line, hScroll + innerWidth);
  if (hScroll <= 0) return truncateToPlainLength(line, innerWidth);
  return sliceByPlainRange(truncated, hScroll, innerWidth);
}

function drawTable(
  files: SelectedFile[],
  formats: OutputFormat[],
  settings: AppSettings,
  selectedIndex: number,
  hScroll: number
): void {
  const frameWidth = getFrameWidth();
  const innerWidth = frameWidth - 2;
  const widths = computeColumnWidths(files, formats, innerWidth);
  const [wS, wO, wF, wC, wI, wSp] = widths;
  const f = getCurrentTheme().frameStyle;
  const splitOn = getSplitForFormats(formats, settings);
  const splitLabel = splitOn ? t("yes") : t("no");
  const defaultIncludeImages = getDefaultIncludeImages(settings, formats);

  const headerCells = [
    padToPlainLength(styleSectionBold("Source"), wS),
    padToPlainLength(styleSectionBold("Output"), wO),
    padToPlainLength(styleSectionBold("Formats"), wF),
    padToPlainLength(styleSectionBold(t("col_chapters")), wC),
    padToPlainLength(styleSectionBold(t("col_images")), wI),
    padToPlainLength(styleSectionBold(t("col_split")), wSp),
  ];
  const headerRow = buildTableRow(headerCells, f);
  const dividerRow = buildTableDivider(widths, f);

  const tableWidth = getPlainLength(headerRow);
  const applyHScroll = (line: string): string =>
    tableWidth <= innerWidth ? line : sliceForWidth(line, hScroll, innerWidth);

  const pageSize = getSelectPageSize();
  const start = Math.max(
    0,
    Math.min(selectedIndex, Math.max(0, files.length - pageSize))
  );
  const visibleFiles = files.slice(start, start + pageSize);

  const contentLine = (content: string): string => {
    const line = applyHScroll(content);
    const plain = getPlainLength(line);
    const pad = plain < innerWidth ? " ".repeat(innerWidth - plain) : "";
    return " " + line + pad + " ";
  };

  const borderedContentWidth = innerWidth - 4;
  const borderedLine = (content: string): string => {
    const line = applyHScroll(content);
    const padded = padToPlainLength(line, borderedContentWidth);
    return " " + f.vertical + " " + padded + " " + f.vertical + " ";
  };

  clearScreen();

  const titleLine = styleMessage(
    t("selected_files_title") + " (Esc to return)"
  );
  process.stdout.write(
    f.topLeft + f.horizontal.repeat(frameWidth - 2) + f.topRight + "\n"
  );
  process.stdout.write(borderedLine(titleLine) + "\n");
  process.stdout.write(
    f.dividerLeft + f.horizontal.repeat(frameWidth - 2) + f.dividerRight + "\n"
  );
  process.stdout.write(contentLine(headerRow) + "\n");
  process.stdout.write(contentLine(dividerRow) + "\n");

  for (let i = 0; i < visibleFiles.length; i++) {
    const globalIndex = start + i;
    const file = visibleFiles[i]!;
    const cells = [
      padToPlainLength(path.basename(file.path), wS),
      padToPlainLength(file.outputBasename, wO),
      padToPlainLength(formats.join(", "), wF),
      padToPlainLength(
        file.chapterIndices === null
          ? "All"
          : `${file.chapterIndices.length} ch`,
        wC
      ),
      padToPlainLength(
        styleSettingValue(
          (file.includeImages ?? defaultIncludeImages) ? t("yes") : t("no")
        ),
        wI
      ),
      padToPlainLength(styleSettingValue(splitLabel), wSp),
    ];
    const rowContent = buildTableRow(cells, f);
    const styled =
      globalIndex === selectedIndex ? styleSelectedRow(rowContent) : rowContent;
    process.stdout.write(contentLine(styled) + "\n");
  }

  process.stdout.write(borderedLine(styleHintTips(t("hint_edit"))) + "\n");
  process.stdout.write(
    f.bottomLeft + f.horizontal.repeat(frameWidth - 2) + f.bottomRight + "\n"
  );
}

export async function promptViewSelectedFilesAndSettings(
  files: SelectedFile[],
  formats: OutputFormat[],
  settings: AppSettings
): Promise<SelectedFile[] | null> {
  if (files.length === 0) return null;

  return new Promise((resolve) => {
    let index = 0;
    let hScroll = 0;

    const getMaxHScroll = (): number => {
      const frameWidth = getFrameWidth();
      const innerWidth = frameWidth - 2;
      const widths = computeColumnWidths(files, formats, innerWidth);
      const rowWidth =
        widths[0]! +
        widths[1]! +
        widths[2]! +
        widths[3]! +
        widths[4]! +
        widths[5]! +
        TABLE_STRUCTURE_FIXED;
      return Math.max(0, rowWidth - innerWidth);
    };

    const render = (): void => {
      drawTable(files, formats, settings, index, hScroll);
    };

    const scrollH = (delta: number): void => {
      const max = getMaxHScroll();
      if (max <= 0) return;
      hScroll = Math.max(0, Math.min(max, hScroll + delta));
      render();
    };

    const move = (delta: number): void => {
      let next = index + delta;
      if (next < 0) next = files.length - 1;
      if (next >= files.length) next = 0;
      index = next;
      render();
    };

    const moveByPage = (delta: number): void => {
      index = Math.max(0, Math.min(index + delta, files.length - 1));
      render();
    };

    const onKeypress = (
      ch: unknown,
      key?: { name?: string; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape" || ch === "\x1b") {
        cleanup();
        resolve(null);
        return;
      }
      if (key?.name === "left" || key?.name === "h") {
        scrollH(-1);
        return;
      }
      if (key?.name === "right" || key?.name === "l") {
        scrollH(1);
        return;
      }
      if (key?.name === "up" || key?.name === "k") {
        move(-1);
        return;
      }
      if (key?.name === "down" || key?.name === "j") {
        move(1);
        return;
      }
      if (key?.name === "pageup") {
        moveByPage(-PAGE_JUMP);
        return;
      }
      if (key?.name === "pagedown") {
        moveByPage(PAGE_JUMP);
        return;
      }
      if (key?.name === "home") {
        index = 0;
        render();
        return;
      }
      if (key?.name === "end") {
        index = Math.max(0, files.length - 1);
        render();
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        const fileIndex = index;
        const existingBasenames = files
          .map((s) => s.outputBasename)
          .filter((_, i) => i !== fileIndex);
        const defaultIncludeImages = getDefaultIncludeImages(settings, formats);
        promptPerFileSettings(
          files[fileIndex]!,
          existingBasenames,
          defaultIncludeImages
        ).then((updated) => {
          const next = [...files];
          next[fileIndex] = updated;
          files.length = 0;
          files.push(...next);
          render();
        });
        return;
      }
    };

    const cleanup = (): void => {
      process.stdin.removeListener("keypress", onKeypress);
      process.stdout.removeListener("resize", onResize);
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };

    const onResize = (): void => render();

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.setRawMode) process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("keypress", onKeypress);
    process.stdout.on("resize", onResize);

    render();
  });
}
