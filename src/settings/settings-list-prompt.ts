import readline from "node:readline";
import process from "node:process";
import { exitNicely } from "../exit.js";
import type { AppSettings } from "./types.js";
import type { HtmlStyle } from "./types.js";
import type { SettingKey } from "./menu.js";
import { getSettingDescription } from "./menu.js";
import {
  styleMessage,
  styleHint,
  styleHintTips,
  styleSettingValue,
  styleSectionBold,
  styleSelectedRow,
  styleDone,
} from "../menus/colors.js";
import {
  getSelectPageSize,
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  truncateToPlainLength,
  PAGE_JUMP,
} from "../menus/utils.js";
import { promptFramedSelect } from "../menus/framed-select.js";

function settingsEqual(a: AppSettings, b: AppSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type SettingsRow = { name: string; value: string; disabled?: boolean };

const HTML_STYLE_ORDER: HtmlStyle[] = ["none", "styled"];
const DESCRIPTION_LINES = 4;

function wrapDescription(text: string, width: number): string[] {
  const lines: string[] = [];
  const words = text.split(/\s+/);
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word.length <= width ? word : word.slice(0, width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function isSectionSeparator(row: SettingsRow): boolean {
  return row.disabled === true;
}

function getSectionStartIndices(rows: SettingsRow[]): number[] {
  const starts: number[] = [];
  let i = 0;
  while (i < rows.length) {
    while (i < rows.length && rows[i] && isSectionSeparator(rows[i]!)) i++;
    if (i < rows.length) starts.push(i);
    while (i < rows.length && rows[i] && !isSectionSeparator(rows[i]!)) i++;
  }
  return starts;
}

function indexOfActiveSectionHeader(
  rows: SettingsRow[],
  selectedIndex: number
): number | null {
  let i = selectedIndex;
  while (i >= 0) {
    if (rows[i] && isSectionSeparator(rows[i]!)) return i;
    i--;
  }
  return null;
}

function cycleSettingForward(key: SettingKey, settings: AppSettings): void {
  const f = settings.formats;
  switch (key) {
    case "addChapterTitles":
      settings.addChapterTitles = !settings.addChapterTitles;
      break;
    case "chapterTitleStyleTxt":
      settings.chapterTitleStyleTxt =
        settings.chapterTitleStyleTxt === "separated" ? "inline" : "separated";
      break;
    case "emDashToHyphen":
      settings.emDashToHyphen = !settings.emDashToHyphen;
      break;
    case "sanitizeWhitespace":
      settings.sanitizeWhitespace = !settings.sanitizeWhitespace;
      break;
    case "newlinesHandling":
      settings.newlinesHandling =
        settings.newlinesHandling === "keep"
          ? "one"
          : settings.newlinesHandling === "one"
            ? "two"
            : "keep";
      break;
    case "chapterFileNameStyle":
      settings.chapterFileNameStyle =
        settings.chapterFileNameStyle === "same"
          ? "chapter"
          : settings.chapterFileNameStyle === "chapter"
            ? "custom"
            : "same";
      break;
    case "md_splitChapters":
      f.md.splitChapters = !f.md.splitChapters;
      break;
    case "md_keepToc":
      f.md.keepToc = !f.md.keepToc;
      break;
    case "md_tocInChaptersFile":
      f.md.tocInChaptersFile = !f.md.tocInChaptersFile;
      break;
    case "md_indexWithToc":
      f.md.indexWithToc = !f.md.indexWithToc;
      if (!f.md.indexWithToc) f.md.addBackLink = false;
      break;
    case "md_addBackLink":
      f.md.addBackLink = !f.md.addBackLink;
      break;
    case "md_addNextLink":
      f.md.addNextLink = !f.md.addNextLink;
      break;
    case "md_addPrevLink":
      f.md.addPrevLink = !f.md.addPrevLink;
      break;
    case "md_includeImages":
      f.md.includeImages = !f.md.includeImages;
      break;
    case "html_splitChapters":
      f.html.splitChapters = !f.html.splitChapters;
      break;
    case "html_keepToc":
      f.html.keepToc = !f.html.keepToc;
      break;
    case "html_tocInChaptersFile":
      f.html.tocInChaptersFile = !f.html.tocInChaptersFile;
      break;
    case "html_indexWithToc":
      f.html.indexWithToc = !f.html.indexWithToc;
      if (!f.html.indexWithToc) f.html.addBackLink = false;
      break;
    case "html_addBackLink":
      f.html.addBackLink = !f.html.addBackLink;
      break;
    case "html_addNextLink":
      f.html.addNextLink = !f.html.addNextLink;
      break;
    case "html_addPrevLink":
      f.html.addPrevLink = !f.html.addPrevLink;
      break;
    case "html_includeImages":
      f.html.includeImages = !f.html.includeImages;
      break;
    case "html_style": {
      const i = HTML_STYLE_ORDER.indexOf(f.html.style);
      f.html.style = HTML_STYLE_ORDER[(i + 1) % HTML_STYLE_ORDER.length];
      break;
    }
    case "json_splitChapters":
      f.json.splitChapters = !f.json.splitChapters;
      break;
    case "json_includeImages":
      f.json.includeImages = !f.json.includeImages;
      break;
    default:
      break;
  }
}

function cycleSettingBackward(key: SettingKey, settings: AppSettings): void {
  const f = settings.formats;
  switch (key) {
    case "addChapterTitles":
      settings.addChapterTitles = !settings.addChapterTitles;
      break;
    case "chapterTitleStyleTxt":
      settings.chapterTitleStyleTxt =
        settings.chapterTitleStyleTxt === "separated" ? "inline" : "separated";
      break;
    case "emDashToHyphen":
      settings.emDashToHyphen = !settings.emDashToHyphen;
      break;
    case "sanitizeWhitespace":
      settings.sanitizeWhitespace = !settings.sanitizeWhitespace;
      break;
    case "newlinesHandling":
      settings.newlinesHandling =
        settings.newlinesHandling === "keep"
          ? "two"
          : settings.newlinesHandling === "one"
            ? "keep"
            : "one";
      break;
    case "chapterFileNameStyle":
      settings.chapterFileNameStyle =
        settings.chapterFileNameStyle === "same"
          ? "custom"
          : settings.chapterFileNameStyle === "chapter"
            ? "same"
            : "chapter";
      break;
    case "md_splitChapters":
      f.md.splitChapters = !f.md.splitChapters;
      break;
    case "md_keepToc":
      f.md.keepToc = !f.md.keepToc;
      break;
    case "md_tocInChaptersFile":
      f.md.tocInChaptersFile = !f.md.tocInChaptersFile;
      break;
    case "md_indexWithToc":
      f.md.indexWithToc = !f.md.indexWithToc;
      if (!f.md.indexWithToc) f.md.addBackLink = false;
      break;
    case "md_addBackLink":
      f.md.addBackLink = !f.md.addBackLink;
      break;
    case "md_addNextLink":
      f.md.addNextLink = !f.md.addNextLink;
      break;
    case "md_addPrevLink":
      f.md.addPrevLink = !f.md.addPrevLink;
      break;
    case "md_includeImages":
      f.md.includeImages = !f.md.includeImages;
      break;
    case "html_splitChapters":
      f.html.splitChapters = !f.html.splitChapters;
      break;
    case "html_keepToc":
      f.html.keepToc = !f.html.keepToc;
      break;
    case "html_tocInChaptersFile":
      f.html.tocInChaptersFile = !f.html.tocInChaptersFile;
      break;
    case "html_indexWithToc":
      f.html.indexWithToc = !f.html.indexWithToc;
      if (!f.html.indexWithToc) f.html.addBackLink = false;
      break;
    case "html_addBackLink":
      f.html.addBackLink = !f.html.addBackLink;
      break;
    case "html_addNextLink":
      f.html.addNextLink = !f.html.addNextLink;
      break;
    case "html_addPrevLink":
      f.html.addPrevLink = !f.html.addPrevLink;
      break;
    case "html_includeImages":
      f.html.includeImages = !f.html.includeImages;
      break;
    case "html_style": {
      const i = HTML_STYLE_ORDER.indexOf(f.html.style);
      f.html.style =
        HTML_STYLE_ORDER[
          (i - 1 + HTML_STYLE_ORDER.length) % HTML_STYLE_ORDER.length
        ];
      break;
    }
    case "json_splitChapters":
      f.json.splitChapters = !f.json.splitChapters;
      break;
    case "json_includeImages":
      f.json.includeImages = !f.json.includeImages;
      break;
    default:
      break;
  }
}

export function cycleSetting(key: SettingKey, settings: AppSettings): void {
  cycleSettingForward(key, settings);
}

export function isCycleable(value: string): boolean {
  const cycleable: string[] = [
    "addChapterTitles",
    "chapterTitleStyleTxt",
    "emDashToHyphen",
    "sanitizeWhitespace",
    "newlinesHandling",
    "chapterFileNameStyle",
    "md_splitChapters",
    "md_keepToc",
    "md_tocInChaptersFile",
    "md_indexWithToc",
    "md_addBackLink",
    "md_addNextLink",
    "md_addPrevLink",
    "md_includeImages",
    "html_splitChapters",
    "html_keepToc",
    "html_tocInChaptersFile",
    "html_indexWithToc",
    "html_addBackLink",
    "html_addNextLink",
    "html_addPrevLink",
    "html_includeImages",
    "html_style",
    "json_splitChapters",
    "json_includeImages",
  ];
  return cycleable.includes(value);
}

export type SettingsListAction =
  | { type: "done" }
  | { type: "cancel" }
  | { type: "openOutputPath" }
  | { type: "openDefaultFormats" }
  | { type: "openTheme" }
  | { type: "openManageHtmlStyles" }
  | { type: "openChooseHtmlStyle" }
  | { type: "openAppLanguage" }
  | { type: "openExportLanguage" }
  | { type: "openCustomPrefix" }
  | { type: "restoreDefaults" }
  | { type: "none" };

const SELECTION_MARGIN = 5;
const SCROLLBAR_THUMB = "\u2588";
const SCROLLBAR_TRACK = " ";

function getScrollbarChar(
  listLineIndex: number,
  pageSize: number,
  totalRows: number,
  start: number
): string {
  const thumbHeight = Math.max(
    1,
    Math.round((pageSize * pageSize) / totalRows)
  );
  const thumbStart = Math.floor((start / totalRows) * pageSize);
  return thumbStart <= listLineIndex && listLineIndex < thumbStart + thumbHeight
    ? SCROLLBAR_THUMB
    : SCROLLBAR_TRACK;
}

function visibleStart(
  index: number,
  rows: SettingsRow[],
  pageSize: number
): number {
  if (rows.length <= pageSize) return 0;
  const start = index - SELECTION_MARGIN;
  return Math.max(0, Math.min(start, rows.length - pageSize));
}

const MIN_VALUE_COLUMN = 42;

function getValueColumn(rows: SettingsRow[]): number {
  let max = MIN_VALUE_COLUMN;
  for (const row of rows) {
    const idx = row.name.indexOf(": ");
    if (idx !== -1) max = Math.max(max, idx + 2);
  }
  return max;
}

function formatSectionTitleRaw(row: SettingsRow, contentWidth: number): string {
  const afterBullet = contentWidth - 2;
  const title = row.name.replace(/^—+\s*|\s*—+$/g, "").trim();
  const displayTitle = " " + title + " ";
  const spaceForDashes = afterBullet - displayTitle.length;
  if (spaceForDashes <= 0) return row.name;
  const leftDashes = Math.floor(spaceForDashes / 2);
  const rightDashes = spaceForDashes - leftDashes;
  return "─".repeat(leftDashes) + displayTitle + "─".repeat(rightDashes);
}

function formatSettingsRow(
  row: SettingsRow,
  valueColumn: number,
  isSelected: boolean,
  isSep: boolean,
  contentWidth: number,
  isActiveSection: boolean
): string {
  const bullet = isSelected ? "▸ " : "  ";

  if (isSep) {
    const raw = formatSectionTitleRaw(row, contentWidth);
    const styled = isActiveSection
      ? styleSelectedRow(raw)
      : styleSectionBold(raw);
    return bullet + styled;
  }
  const idx = row.name.indexOf(": ");
  const labelPart = idx === -1 ? row.name : row.name.slice(0, idx + 2);
  const valuePart = idx === -1 ? "" : row.name.slice(idx + 2);
  const paddedLabel = labelPart.padEnd(valueColumn);
  const content =
    paddedLabel + (isSelected ? valuePart : styleSettingValue(valuePart));
  return isSelected ? styleSelectedRow(bullet + content) : bullet + content;
}

const SAVE_BEFORE_EXIT_CHOICES = [
  { name: "Save", value: "save" },
  { name: "Don't save", value: "discard" },
  { name: "Cancel", value: "cancel" },
] as const;

export function promptSettingsList(
  settings: AppSettings,
  getRows: () => SettingsRow[],
  initialSettings?: AppSettings
): Promise<SettingsListAction> {
  return new Promise((resolve) => {
    const pageSize = Math.max(5, getSelectPageSize() - DESCRIPTION_LINES - 2);
    let rows = getRows();
    let index = 0;
    while (index < rows.length && rows[index]?.disabled) index++;
    if (index >= rows.length) index = 0;

    const render = (): void => {
      rows = getRows();
      const valueColumn = getValueColumn(rows);
      const start = visibleStart(index, rows, pageSize);
      const visible = rows.slice(start, start + pageSize);
      const message = styleMessage("Settings (Esc to return to main menu)");
      const hint = styleHintTips(
        " ↑/↓ move  ←/→ section  Space/Tab cycle  Enter select  R restore  Esc back"
      );
      const width = getFrameWidth();
      const showScrollbar = rows.length > pageSize;
      const innerWidth = Math.max(0, showScrollbar ? width - 5 : width - 4);
      const selectedRow = rows[index];
      const descriptionText = selectedRow
        ? getSettingDescription(selectedRow.value, settings)
        : "";
      const descriptionWrapped = wrapDescription(
        descriptionText,
        Math.max(20, innerWidth)
      ).slice(0, DESCRIPTION_LINES);
      const descriptionLines = descriptionWrapped.map((l) => styleHint(l));
      const valueColumnCapped = Math.min(valueColumn, innerWidth - 2);
      const activeSectionHeaderIndex = indexOfActiveSectionHeader(rows, index);
      const rowLines: string[] = [];
      const rowLineToLogicalIndex: number[] = [];
      for (let i = 0; i < visible.length; i++) {
        const row = visible[i]!;
        const globalIndex = start + i;
        const isSelected = globalIndex === index;
        const isActiveSection =
          activeSectionHeaderIndex !== null &&
          globalIndex === activeSectionHeaderIndex;
        if (row.value === "__done__") {
          rowLines.push("");
          rowLineToLogicalIndex.push(i);
          const doneLabel = isSelected ? "> Done <" : "Done";
          const plainLen = doneLabel.length;
          const leftPad = Math.floor((innerWidth - plainLen) / 2);
          const rightPad = innerWidth - plainLen - leftPad;
          const centered =
            " ".repeat(leftPad) + doneLabel + " ".repeat(rightPad);
          const doneLine = isSelected
            ? styleSelectedRow(centered)
            : " ".repeat(leftPad) + styleDone("Done") + " ".repeat(rightPad);
          rowLines.push(doneLine);
          rowLineToLogicalIndex.push(i);
        } else {
          const isSep =
            row.value === "__sep_app__" ||
            row.value === "__sep__" ||
            row.value === "__sep2__" ||
            row.value === "__sep3__" ||
            row.value === "__sep4__" ||
            row.value === "__sep5__";
          rowLines.push(
            formatSettingsRow(
              row,
              valueColumnCapped,
              isSelected,
              isSep,
              innerWidth,
              isActiveSection
            )
          );
          rowLineToLogicalIndex.push(i);
        }
      }
      const lines: string[] = [
        message,
        "",
        ...rowLines,
        "",
        hint,
        ...(descriptionLines.length > 0 ? ["", ...descriptionLines] : []),
      ];
      clearScreen();
      process.stdout.write(frameTop(width) + "\n");
      const contentWidth = showScrollbar ? width - 5 : width - 4;
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const rawLine = lines[lineIndex]!;
        const line = showScrollbar
          ? truncateToPlainLength(rawLine, contentWidth)
          : rawLine;
        const scrollbarChar = showScrollbar
          ? lineIndex >= 2 && lineIndex < 2 + rowLines.length
            ? getScrollbarChar(
                rowLineToLogicalIndex[lineIndex - 2] ?? 0,
                pageSize,
                rows.length,
                start
              )
            : SCROLLBAR_TRACK
          : undefined;
        process.stdout.write(frameLine(line, width, scrollbarChar) + "\n");
      }
      process.stdout.write(frameBottom(width) + "\n");
    };

    const move = (delta: number): void => {
      let next = index + delta;
      if (next < 0) next = rows.length - 1;
      if (next >= rows.length) next = 0;
      while (next >= 0 && next < rows.length && rows[next]?.disabled) {
        next += delta;
        if (next < 0) next = rows.length - 1;
        if (next >= rows.length) next = 0;
      }
      if (next >= 0 && next < rows.length) index = next;
      render();
    };

    const findNextBy = (from: number, delta: number, steps: number): number => {
      let next = from;
      for (let i = 0; i < steps; i++) {
        next += delta;
        if (next < 0) next = rows.length - 1;
        if (next >= rows.length) next = 0;
        while (next >= 0 && next < rows.length && rows[next]?.disabled) {
          next += delta;
          if (next < 0) next = rows.length - 1;
          if (next >= rows.length) next = 0;
        }
      }
      return next;
    };

    const moveByPage = (delta: number): void => {
      index = findNextBy(index, delta, PAGE_JUMP);
      render();
    };

    const goHome = (): void => {
      let i = 0;
      while (i < rows.length && rows[i]?.disabled) i++;
      if (i < rows.length) index = i;
      render();
    };

    const goEnd = (): void => {
      let i = rows.length - 1;
      while (i >= 0 && rows[i]?.disabled) i--;
      if (i >= 0) index = i;
      render();
    };

    const skipToNextSection = (): void => {
      const starts = getSectionStartIndices(rows);
      if (starts.length === 0) return;
      const nextStart = starts.find((s) => s > index);
      index = nextStart !== undefined ? nextStart : starts[0]!;
      render();
    };

    const skipToPrevSection = (): void => {
      const starts = getSectionStartIndices(rows);
      if (starts.length === 0) return;
      const prevStarts = starts.filter((s) => s < index);
      index =
        prevStarts.length > 0
          ? prevStarts[prevStarts.length - 1]!
          : starts[starts.length - 1]!;
      render();
    };

    const cycleCurrent = (forward: boolean): void => {
      const row = rows[index];
      if (!row?.disabled && isCycleable(row.value)) {
        if (forward) cycleSettingForward(row.value as SettingKey, settings);
        else cycleSettingBackward(row.value as SettingKey, settings);
        render();
      }
    };

    const onKeypress = (
      ch: unknown,
      key?: { name?: string; shift?: boolean; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape" || ch === "\x1b") {
        if (!initialSettings || settingsEqual(settings, initialSettings)) {
          cleanup();
          resolve({ type: "cancel" });
          return;
        }
        cleanup();
        promptFramedSelect(
          "You have unsaved changes. Save before exiting?",
          [...SAVE_BEFORE_EXIT_CHOICES],
          "Enter select  Esc cancel",
          0
        ).then((result) => {
          if (result === "save") {
            resolve({ type: "done" });
          } else if (result === "discard" || result === null) {
            resolve({ type: "cancel" });
          } else {
            promptSettingsList(settings, getRows, initialSettings).then(
              resolve
            );
          }
        });
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
        moveByPage(-1);
        return;
      }
      if (key?.name === "pagedown") {
        moveByPage(1);
        return;
      }
      if (key?.name === "home") {
        goHome();
        return;
      }
      if (key?.name === "end") {
        goEnd();
        return;
      }
      if (key?.name === "right" || key?.name === "l") {
        skipToNextSection();
        return;
      }
      if (key?.name === "left" || key?.name === "h") {
        skipToPrevSection();
        return;
      }
      if (key?.name === "r" && !key?.ctrl && !key?.shift) {
        cleanup();
        resolve({ type: "restoreDefaults" });
        return;
      }
      const row = rows[index];
      if (!row) return;

      if (key?.name === "space" || (key?.name === "tab" && !key?.shift)) {
        cycleCurrent(true);
        return;
      }
      if (key?.name === "tab" && key?.shift) {
        cycleCurrent(false);
        return;
      }

      if (key?.name === "return" || key?.name === "enter") {
        if (row.value === "__done__") {
          cleanup();
          resolve({ type: "done" });
          return;
        }
        if (row.value === "outputPath") {
          cleanup();
          resolve({ type: "openOutputPath" });
          return;
        }
        if (row.value === "defaultFormats") {
          cleanup();
          resolve({ type: "openDefaultFormats" });
          return;
        }
        if (row.value === "theme") {
          cleanup();
          resolve({ type: "openTheme" });
          return;
        }
        if (row.value === "app_language") {
          cleanup();
          resolve({ type: "openAppLanguage" });
          return;
        }
        if (row.value === "export_language") {
          cleanup();
          resolve({ type: "openExportLanguage" });
          return;
        }
        if (row.value === "html_styles") {
          cleanup();
          resolve({ type: "openManageHtmlStyles" });
          return;
        }
        if (row.value === "html_style_theme") {
          cleanup();
          resolve({ type: "openChooseHtmlStyle" });
          return;
        }
        if (row.value === "chapterFileNameCustomPrefix") {
          cleanup();
          resolve({ type: "openCustomPrefix" });
          return;
        }
        if (!row.disabled) cycleCurrent(true);
      }
    };

    const cleanup = (): void => {
      process.stdin.removeListener("keypress", onKeypress);
      process.stdout.removeListener("resize", onResize);
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };

    const onResize = (): void => {
      render();
    };

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
