import readline from "node:readline";
import process from "node:process";
import { exitNicely } from "../exit.js";
import { styleMessage, styleHintTips, styleSelectedRow } from "./colors.js";
import {
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  getSelectPageSize,
  PAGE_JUMP,
  sliceByPlainRange,
  truncateToPlainLength,
  getPlainLength,
} from "./utils.js";

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

export interface FramedChoice {
  name: string;
  value: string;
}

function visibleStart(index: number, length: number, pageSize: number): number {
  if (length <= pageSize) return 0;
  return Math.max(0, Math.min(index, length - pageSize));
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

export function drawFramedChoiceList(
  title: string,
  choices: FramedChoice[],
  selectedIndex: number,
  hint: string,
  contentLines?: string[],
  hScroll?: number
): void {
  const pageSize = getSelectPageSize();
  const width = getFrameWidth();
  const innerWidth = width - 4;
  const scroll = hScroll ?? 0;
  const start = visibleStart(selectedIndex, choices.length, pageSize);
  const visible = choices.slice(start, start + pageSize);
  const allLines: string[] = [
    styleMessage(title),
    ...(contentLines ?? []),
    ...(contentLines?.length ? [""] : []),
    ...visible.map((choice, i) => {
      const globalIndex = start + i;
      const isSelected = globalIndex === selectedIndex;
      const bullet = isSelected ? "▸ " : "  ";
      const content = bullet + choice.name;
      return isSelected ? styleSelectedRow(content) : content;
    }),
    "",
    styleHintTips(hint),
  ];
  const lines =
    hScroll !== undefined
      ? allLines.map((l) => sliceForWidth(l, scroll, innerWidth))
      : allLines;
  clearScreen();
  process.stdout.write(frameTop(width) + "\n");
  for (const line of lines) {
    process.stdout.write(frameLine(line, width) + "\n");
  }
  process.stdout.write(frameBottom(width) + "\n");
}

export interface FramedSelectOptions {
  horizontalScroll?: boolean;
}

export function promptFramedSelect(
  title: string,
  choices: FramedChoice[],
  hint: string,
  defaultIndex = 0,
  contentLines?: string[],
  options?: FramedSelectOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    let index = Math.max(0, Math.min(defaultIndex, choices.length - 1));
    let hScroll: number | undefined = options?.horizontalScroll ? 0 : undefined;

    const getMaxContentWidth = (): number => {
      let max = 0;
      for (const c of choices) {
        max = Math.max(max, getPlainLength(c.name) + 2);
      }
      for (const line of contentLines ?? []) {
        max = Math.max(max, getPlainLength(line));
      }
      return max;
    };

    const getMaxHScroll = (): number => {
      const width = getFrameWidth();
      const innerWidth = width - 4;
      return Math.max(0, getMaxContentWidth() - innerWidth);
    };

    const render = (): void => {
      drawFramedChoiceList(title, choices, index, hint, contentLines, hScroll);
    };

    const scrollH = (delta: number): void => {
      if (!options?.horizontalScroll) return;
      const max = getMaxHScroll();
      if (max <= 0) return;
      hScroll = Math.max(0, Math.min(max, (hScroll ?? 0) + delta));
      render();
    };

    const move = (delta: number): void => {
      let next = index + delta;
      if (next < 0) next = choices.length - 1;
      if (next >= choices.length) next = 0;
      index = next;
      render();
    };

    const moveByPage = (delta: number): void => {
      const next = Math.max(0, Math.min(index + delta, choices.length - 1));
      index = next;
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
        index = Math.max(0, choices.length - 1);
        render();
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        cleanup();
        resolve(choices[index]?.value ?? null);
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

const SCROLLABLE_CONTENT_RESERVE = 7;

function drawScrollableContent(
  title: string,
  getContent: () => string[],
  contentScroll: number,
  hint: string
): void {
  const width = getFrameWidth();
  const contentLines = getContent();
  const rows =
    typeof process.stdout.rows === "number" && process.stdout.rows > 0
      ? process.stdout.rows
      : 24;
  const maxVisible = Math.max(1, rows - SCROLLABLE_CONTENT_RESERVE);
  const maxScroll = Math.max(0, contentLines.length - maxVisible);
  const scroll = Math.min(contentScroll, maxScroll);
  const visibleContent = contentLines.slice(scroll, scroll + maxVisible);
  const showScrollbar = contentLines.length > maxVisible;
  const contentWidth = showScrollbar ? width - 5 : width - 4;
  const truncatedContent = visibleContent.map((l) =>
    truncateToPlainLength(l, contentWidth)
  );
  const lines: string[] = [
    styleMessage(title),
    ...truncatedContent,
    "",
    "  ▶  Back",
    "",
    styleHintTips(hint),
  ];
  clearScreen();
  process.stdout.write(frameTop(width) + "\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const scrollbarChar =
      showScrollbar && i >= 1 && i - 1 < visibleContent.length
        ? getScrollbarChar(i - 1, maxVisible, contentLines.length, scroll)
        : showScrollbar
          ? SCROLLBAR_TRACK
          : undefined;
    process.stdout.write(frameLine(line, width, scrollbarChar) + "\n");
  }
  process.stdout.write(frameBottom(width) + "\n");
}

export function promptScrollableContent(
  title: string,
  getContent: () => string[],
  hint: string
): Promise<void> {
  return new Promise((resolve) => {
    let contentScroll = 0;

    const getMaxScroll = (): number => {
      const contentLines = getContent();
      const rows =
        typeof process.stdout.rows === "number" && process.stdout.rows > 0
          ? process.stdout.rows
          : 24;
      const maxVisible = Math.max(1, rows - SCROLLABLE_CONTENT_RESERVE);
      return Math.max(0, contentLines.length - maxVisible);
    };

    const render = (): void => {
      const max = getMaxScroll();
      contentScroll = Math.min(contentScroll, max);
      drawScrollableContent(title, getContent, contentScroll, hint);
    };

    const scrollContent = (delta: number): void => {
      const maxScroll = getMaxScroll();
      contentScroll = Math.max(0, Math.min(maxScroll, contentScroll + delta));
      render();
    };

    const onKeypress = (
      ch: unknown,
      key?: { name?: string; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (
        key?.name === "escape" ||
        ch === "\x1b" ||
        key?.name === "return" ||
        key?.name === "enter"
      ) {
        cleanup();
        resolve();
        return;
      }
      if (key?.name === "up" || key?.name === "k") {
        scrollContent(-1);
        return;
      }
      if (key?.name === "down" || key?.name === "j") {
        scrollContent(1);
        return;
      }
      if (key?.name === "pageup") {
        scrollContent(-PAGE_JUMP);
        return;
      }
      if (key?.name === "pagedown") {
        scrollContent(PAGE_JUMP);
        return;
      }
      if (key?.name === "home") {
        contentScroll = 0;
        render();
        return;
      }
      if (key?.name === "end") {
        contentScroll = getMaxScroll();
        render();
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

export type FramedSelectLoopAction<T> = "continue" | T | null;

export function promptFramedSelectLoop<T>(
  getTitle: () => string,
  getChoices: () => FramedChoice[],
  hint: string,
  onKey: (
    key: "enter" | "escape" | "ctrl+s",
    selectedValue?: string
  ) => FramedSelectLoopAction<T>
): Promise<T | null> {
  return new Promise((resolve) => {
    let index = 0;
    let choices = getChoices();

    const render = (): void => {
      choices = getChoices();
      index = Math.max(0, Math.min(index, choices.length - 1));
      drawFramedChoiceList(getTitle(), choices, index, hint);
    };

    const move = (delta: number): void => {
      let next = index + delta;
      if (next < 0) next = choices.length - 1;
      if (next >= choices.length) next = 0;
      index = next;
      render();
    };

    const moveByPage = (delta: number): void => {
      const next = Math.max(0, Math.min(index + delta, choices.length - 1));
      index = next;
      render();
    };

    const onKeypress = (
      ch: unknown,
      key?: { name?: string; ctrl?: boolean; meta?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape" || ch === "\x1b") {
        const result = onKey("escape");
        if (result !== "continue") {
          cleanup();
          resolve(result);
        }
        return;
      }
      if (
        (key?.ctrl || key?.meta) &&
        (key?.name === "s" || key?.name === "S")
      ) {
        const result = onKey("ctrl+s");
        if (result !== "continue") {
          cleanup();
          resolve(result);
        }
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
        index = Math.max(0, choices.length - 1);
        render();
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        const value = choices[index]?.value;
        const result = onKey("enter", value);
        if (result === "continue") {
          index = 0;
          render();
        } else {
          cleanup();
          resolve(result);
        }
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
