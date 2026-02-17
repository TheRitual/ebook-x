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
} from "../menus/colors.js";
import {
  getSelectPageSize,
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  PAGE_JUMP,
} from "../menus/utils.js";

export type SettingsRow = { name: string; value: string; disabled?: boolean };

const HTML_STYLE_ORDER: HtmlStyle[] = ["none", "styled", "custom"];
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

function cycleSettingForward(key: SettingKey, settings: AppSettings): void {
  switch (key) {
    case "htmlStyle": {
      const i = HTML_STYLE_ORDER.indexOf(settings.htmlStyle);
      settings.htmlStyle = HTML_STYLE_ORDER[(i + 1) % HTML_STYLE_ORDER.length];
      break;
    }
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
    case "keepToc":
      settings.keepToc = !settings.keepToc;
      break;
    case "splitChapters":
      settings.splitChapters = !settings.splitChapters;
      break;
    case "chapterFileNameStyle":
      settings.chapterFileNameStyle =
        settings.chapterFileNameStyle === "same"
          ? "chapter"
          : settings.chapterFileNameStyle === "chapter"
            ? "custom"
            : "same";
      break;
    case "includeImages":
      settings.includeImages = !settings.includeImages;
      break;
    case "mdTocForChapters":
      settings.mdTocForChapters = !settings.mdTocForChapters;
      break;
    case "indexTocForChapters":
      settings.indexTocForChapters = !settings.indexTocForChapters;
      if (!settings.indexTocForChapters) settings.addBackLinkToChapters = false;
      break;
    case "addBackLinkToChapters":
      settings.addBackLinkToChapters = !settings.addBackLinkToChapters;
      break;
    default:
      break;
  }
}

function cycleSettingBackward(key: SettingKey, settings: AppSettings): void {
  switch (key) {
    case "htmlStyle": {
      const i = HTML_STYLE_ORDER.indexOf(settings.htmlStyle);
      settings.htmlStyle =
        HTML_STYLE_ORDER[
          (i - 1 + HTML_STYLE_ORDER.length) % HTML_STYLE_ORDER.length
        ];
      break;
    }
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
    case "keepToc":
      settings.keepToc = !settings.keepToc;
      break;
    case "splitChapters":
      settings.splitChapters = !settings.splitChapters;
      break;
    case "chapterFileNameStyle":
      settings.chapterFileNameStyle =
        settings.chapterFileNameStyle === "same"
          ? "custom"
          : settings.chapterFileNameStyle === "chapter"
            ? "same"
            : "chapter";
      break;
    case "includeImages":
      settings.includeImages = !settings.includeImages;
      break;
    case "mdTocForChapters":
      settings.mdTocForChapters = !settings.mdTocForChapters;
      break;
    case "indexTocForChapters":
      settings.indexTocForChapters = !settings.indexTocForChapters;
      if (!settings.indexTocForChapters) settings.addBackLinkToChapters = false;
      break;
    case "addBackLinkToChapters":
      settings.addBackLinkToChapters = !settings.addBackLinkToChapters;
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
    "htmlStyle",
    "addChapterTitles",
    "chapterTitleStyleTxt",
    "emDashToHyphen",
    "sanitizeWhitespace",
    "newlinesHandling",
    "keepToc",
    "splitChapters",
    "chapterFileNameStyle",
    "includeImages",
    "mdTocForChapters",
    "indexTocForChapters",
    "addBackLinkToChapters",
  ];
  return cycleable.includes(value);
}

export type SettingsListAction =
  | { type: "done" }
  | { type: "cancel" }
  | { type: "openOutputPath" }
  | { type: "openDefaultFormats" }
  | { type: "openCustomPrefix" }
  | { type: "restoreDefaults" }
  | { type: "none" };

function visibleStart(
  index: number,
  rows: SettingsRow[],
  pageSize: number
): number {
  if (rows.length <= pageSize) return 0;
  return Math.max(0, Math.min(index, rows.length - pageSize));
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

function formatSectionTitle(row: SettingsRow): string {
  const innerWidth = getFrameWidth() - 4;
  const afterBullet = innerWidth - 2;
  const title = row.name.replace(/^—+\s*|\s*—+$/g, "").trim();
  const displayTitle = " " + title + " ";
  const spaceForDashes = afterBullet - displayTitle.length;
  if (spaceForDashes <= 0) return styleSectionBold(row.name);
  const leftDashes = Math.floor(spaceForDashes / 2);
  const rightDashes = spaceForDashes - leftDashes;
  const line = "─".repeat(leftDashes) + displayTitle + "─".repeat(rightDashes);
  return styleSectionBold(line);
}

function formatSettingsRow(
  row: SettingsRow,
  valueColumn: number,
  isSelected: boolean,
  isSep: boolean
): string {
  const bullet = isSelected ? "▸ " : "  ";

  if (isSep) {
    return isSelected
      ? styleSelectedRow(bullet + formatSectionTitle(row))
      : bullet + formatSectionTitle(row);
  }
  const idx = row.name.indexOf(": ");
  const labelPart = idx === -1 ? row.name : row.name.slice(0, idx + 2);
  const valuePart = idx === -1 ? "" : row.name.slice(idx + 2);
  const paddedLabel = labelPart.padEnd(valueColumn);
  const content =
    paddedLabel + (isSelected ? valuePart : styleSettingValue(valuePart));
  return isSelected ? styleSelectedRow(bullet + content) : bullet + content;
}

export function promptSettingsList(
  settings: AppSettings,
  getRows: () => SettingsRow[]
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
        " ↑/↓ move  Space/Tab cycle  Shift+Tab cycle back  Enter select  R restore defaults  Esc back"
      );
      const width = getFrameWidth();
      const selectedRow = rows[index];
      const descriptionText = selectedRow
        ? getSettingDescription(selectedRow.value, settings)
        : "";
      const descriptionWrapped = wrapDescription(
        descriptionText,
        Math.max(20, width - 4)
      ).slice(0, DESCRIPTION_LINES);
      const descriptionLines = descriptionWrapped.map((l) => styleHint(l));
      const lines: string[] = [
        message,
        "",
        ...visible.map((row, i) => {
          const globalIndex = start + i;
          const isSelected = globalIndex === index;
          const isSep =
            row.value === "__sep__" ||
            row.value === "__sep2__" ||
            row.value === "__sep3__" ||
            row.value === "__sep4__" ||
            row.value === "__sep5__";
          return formatSettingsRow(row, valueColumn, isSelected, isSep);
        }),
        "",
        hint,
        ...(descriptionLines.length > 0 ? ["", ...descriptionLines] : []),
      ];
      clearScreen();
      process.stdout.write(frameTop(width) + "\n");
      for (const line of lines) {
        process.stdout.write(frameLine(line, width) + "\n");
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

    const cycleCurrent = (forward: boolean): void => {
      const row = rows[index];
      if (!row?.disabled && isCycleable(row.value)) {
        if (forward) cycleSettingForward(row.value as SettingKey, settings);
        else cycleSettingBackward(row.value as SettingKey, settings);
        render();
      }
    };

    const onKeypress = (
      _ch: unknown,
      key?: { name?: string; shift?: boolean; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape") {
        cleanup();
        resolve({ type: "cancel" });
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
