import readline from "node:readline";
import process from "node:process";
import { exitNicely } from "../exit.js";
import { theme, styleMessage, styleHint } from "./colors.js";
import {
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  getSelectPageSize,
} from "./utils.js";

export interface FramedChoice {
  name: string;
  value: string;
}

function visibleStart(index: number, length: number, pageSize: number): number {
  if (length <= pageSize) return 0;
  return Math.max(0, Math.min(index, length - pageSize));
}

export function drawFramedChoiceList(
  title: string,
  choices: FramedChoice[],
  selectedIndex: number,
  hint: string,
  contentLines?: string[]
): void {
  const pageSize = getSelectPageSize();
  const width = getFrameWidth();
  const start = visibleStart(selectedIndex, choices.length, pageSize);
  const visible = choices.slice(start, start + pageSize);
  const lines: string[] = [
    styleMessage(title),
    ...(contentLines ?? []),
    ...(contentLines?.length ? [""] : []),
    ...visible.map((choice, i) => {
      const globalIndex = start + i;
      const isSelected = globalIndex === selectedIndex;
      const bullet = isSelected ? "▸ " : "  ";
      const content = bullet + choice.name;
      return isSelected
        ? theme.selectedBg + theme.selected + content + theme.reset
        : content;
    }),
    "",
    styleHint(hint),
  ];
  clearScreen();
  process.stdout.write(frameTop(width) + "\n");
  for (const line of lines) {
    process.stdout.write(frameLine(line, width) + "\n");
  }
  process.stdout.write(frameBottom(width) + "\n");
}

export function promptFramedSelect(
  title: string,
  choices: FramedChoice[],
  hint: string,
  defaultIndex = 0,
  contentLines?: string[]
): Promise<string | null> {
  return new Promise((resolve) => {
    let index = Math.max(0, Math.min(defaultIndex, choices.length - 1));

    const render = (): void => {
      drawFramedChoiceList(title, choices, index, hint, contentLines);
    };

    const move = (delta: number): void => {
      let next = index + delta;
      if (next < 0) next = choices.length - 1;
      if (next >= choices.length) next = 0;
      index = next;
      render();
    };

    const onKeypress = (
      _ch: unknown,
      key?: { name?: string; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape") {
        cleanup();
        resolve(null);
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

    const onKeypress = (
      _ch: unknown,
      key?: { name?: string; ctrl?: boolean; meta?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        exitNicely();
      }
      if (key?.name === "escape") {
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
