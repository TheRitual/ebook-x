import readline from "node:readline";
import process from "node:process";
import { exitNicely } from "../exit.js";
import { getEpubChapters } from "../converter/index.js";
import type { EpubChapterInfo } from "../converter/types.js";
import type { SelectedFile } from "./selected-file-types.js";
import {
  styleMessage,
  styleHintTips,
  styleSettingValue,
  styleSelectedRow,
  inquirerTheme,
} from "../menus/colors.js";
import {
  getSelectPageSize,
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  frameMessage,
  PAGE_JUMP,
} from "../menus/utils.js";
import { sanitizeOutputBasename } from "../utils/path-sanitize.js";
import { input } from "@inquirer/prompts";

function formatChapterRow(
  ch: EpubChapterInfo,
  selected: boolean,
  isCursor: boolean
): string {
  const bullet = isCursor ? "▸ " : "  ";
  const check = selected ? "☑" : "☐";
  const label = `Ch.${ch.index} ${ch.title}`.slice(0, 55);
  const line = bullet + check + " " + label;
  return isCursor ? styleSelectedRow(line) : line;
}

export async function promptOutputBasename(
  current: string,
  existing: string[]
): Promise<string> {
  clearScreen();
  const name = await input({
    message: frameMessage("Output file name (without extension)"),
    default: current,
    theme: inquirerTheme,
    validate: (value) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) return "Please enter a non-empty name.";
      if (/[<>:"/\\|?*]/.test(trimmed))
        return 'Name must not contain <>:"/\\|?*';
      if (existing.includes(trimmed) && trimmed !== current)
        return "Name already used by another file.";
      return true;
    },
  });
  const trimmed = name.trim() || current;
  return trimmed
    ? sanitizeOutputBasename(trimmed)
    : sanitizeOutputBasename(current);
}

export async function promptChapterSelection(
  filePath: string,
  currentIndices: number[] | null
): Promise<number[] | null> {
  let chapters: EpubChapterInfo[] = [];
  try {
    chapters = await getEpubChapters(filePath);
  } catch {
    return currentIndices;
  }

  const selectedSet = new Set(currentIndices ?? chapters.map((c) => c.index));

  return new Promise((resolve) => {
    let index = 0;
    const pageSize = getSelectPageSize();
    const width = getFrameWidth();

    const render = (): void => {
      const start = Math.max(
        0,
        Math.min(index, chapters.length + 1 - pageSize)
      );
      const visible = chapters.slice(start, start + pageSize);
      const lines: string[] = [
        styleMessage("Select chapters (Space toggle, Enter done, Esc cancel)"),
        "",
        ...visible.map((ch, i) => {
          const globalIdx = start + i;
          return formatChapterRow(
            ch,
            selectedSet.has(ch.index),
            index === globalIdx
          );
        }),
        "",
        styleHintTips(
          `Selected ${selectedSet.size}/${chapters.length}  Space toggle  Enter done`
        ),
      ];
      clearScreen();
      process.stdout.write(frameTop(width) + "\n");
      for (const line of lines) {
        process.stdout.write(frameLine(line, width) + "\n");
      }
      process.stdout.write(frameBottom(width) + "\n");
    };

    const onKeypress = (
      _ch: unknown,
      key?: { name?: string; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") exitNicely();
      if (key?.name === "escape") {
        cleanup();
        resolve(currentIndices);
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        cleanup();
        const arr = [...selectedSet].sort((a, b) => a - b);
        resolve(arr.length === chapters.length ? null : arr);
        return;
      }
      if (key?.name === "space") {
        const ch = chapters[index];
        if (ch) {
          if (selectedSet.has(ch.index)) {
            selectedSet.delete(ch.index);
          } else {
            selectedSet.add(ch.index);
          }
        }
        render();
        return;
      }
      if (key?.name === "up" || key?.name === "k") {
        index = index <= 0 ? chapters.length - 1 : index - 1;
        render();
        return;
      }
      if (key?.name === "down" || key?.name === "j") {
        index = index >= chapters.length - 1 ? 0 : index + 1;
        render();
        return;
      }
      const maxCh = Math.max(0, chapters.length - 1);
      if (key?.name === "pageup") {
        index = Math.max(0, index - PAGE_JUMP);
        render();
        return;
      }
      if (key?.name === "pagedown") {
        index = Math.min(maxCh, index + PAGE_JUMP);
        render();
        return;
      }
      if (key?.name === "home") {
        index = 0;
        render();
        return;
      }
      if (key?.name === "end") {
        index = maxCh;
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

type PerFileRow = { name: string; value: string; cycle?: boolean };

function formatPerFileRow(row: PerFileRow, isCur: boolean): string {
  const bullet = isCur ? "▸ " : "  ";
  const label = row.name + (row.value ? ": " : "");
  const valuePart =
    row.value === "" ? label : label + styleSettingValue(row.value);
  const content = bullet + valuePart;
  return isCur ? styleSelectedRow(content) : content;
}

export async function promptPerFileSettings(
  file: SelectedFile,
  existingBasenames: string[]
): Promise<SelectedFile> {
  const result = { ...file };
  const otherBasenames = existingBasenames.filter(
    (b) => b !== file.outputBasename
  );

  const getRows = (): PerFileRow[] => [
    { name: "Output name", value: result.outputBasename },
    {
      name: "Chapters",
      value:
        result.chapterIndices === null
          ? "All"
          : `${result.chapterIndices.length} selected`,
    },
    {
      name: "Extract images",
      value: result.includeImages ? "Yes" : "No",
      cycle: true,
    },
    { name: "Done", value: "" },
  ];

  for (;;) {
    const rows = getRows();
    const choice = await new Promise<number>((resolve) => {
      let index = 0;
      const width = getFrameWidth();

      const render = (): void => {
        const currentRows = getRows();
        const lines: string[] = [
          styleMessage(
            `Settings for ${file.path.split("/").pop() ?? file.path}`
          ),
          "",
          ...currentRows.map((row, i) => formatPerFileRow(row, i === index)),
          "",
          styleHintTips(
            "↑/↓ move  Space/Tab cycle  Enter select  PgUp/PgDn/Home/End  Esc back"
          ),
        ];
        clearScreen();
        process.stdout.write(frameTop(width) + "\n");
        for (const line of lines) {
          process.stdout.write(frameLine(line, width) + "\n");
        }
        process.stdout.write(frameBottom(width) + "\n");
      };

      const onKeypress = (
        _ch: unknown,
        key?: { name?: string; ctrl?: boolean; shift?: boolean }
      ): void => {
        if (key?.ctrl && key?.name === "c") exitNicely();
        if (key?.name === "escape") {
          cleanup();
          resolve(-1);
          return;
        }
        if (key?.name === "space" || (key?.name === "tab" && !key?.shift)) {
          const row = getRows()[index];
          if (row?.cycle) {
            result.includeImages = !result.includeImages;
            render();
          }
          return;
        }
        if (key?.name === "tab" && key?.shift) {
          const row = getRows()[index];
          if (row?.cycle) {
            result.includeImages = !result.includeImages;
            render();
          }
          return;
        }
        if (key?.name === "return" || key?.name === "enter") {
          cleanup();
          resolve(index);
          return;
        }
        if (key?.name === "up" || key?.name === "k") {
          index = index <= 0 ? rows.length - 1 : index - 1;
          render();
          return;
        }
        if (key?.name === "down" || key?.name === "j") {
          index = index >= rows.length - 1 ? 0 : index + 1;
          render();
          return;
        }
        const maxIdx = Math.max(0, rows.length - 1);
        if (key?.name === "pageup") {
          index = Math.max(0, index - PAGE_JUMP);
          render();
          return;
        }
        if (key?.name === "pagedown") {
          index = Math.min(maxIdx, index + PAGE_JUMP);
          render();
          return;
        }
        if (key?.name === "home") {
          index = 0;
          render();
          return;
        }
        if (key?.name === "end") {
          index = maxIdx;
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

    if (choice === -1) return result;
    if (choice === 3) return result;

    if (choice === 0) {
      const name = await promptOutputBasename(
        result.outputBasename,
        otherBasenames
      );
      result.outputBasename = name;
    }
    if (choice === 1) {
      result.chapterIndices = await promptChapterSelection(
        file.path,
        result.chapterIndices
      );
    }
    if (choice === 2) {
      result.includeImages = !result.includeImages;
    }
  }
}
