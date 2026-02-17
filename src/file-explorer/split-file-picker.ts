import readline from "node:readline";
import path from "node:path";
import process from "node:process";
import { exitNicely } from "../exit.js";
import { listEntries } from "./utils.js";
import type { SelectedFile } from "./selected-file-types.js";
import { getUniqueOutputBasename } from "./utils/unique-basename.js";
import {
  drawSplitFrame,
  getSplitPanelWidths,
  formatLeftEntry,
  formatRightEntry,
} from "../menus/split-utils.js";
import { PAGE_JUMP } from "../menus/utils.js";

export type SplitFilePickerResult =
  | SelectedFile[]
  | null
  | "settings"
  | {
      type: "edit";
      selected: SelectedFile[];
      index: number;
      state: Omit<SplitFilePickerState, "selected">;
    };

const COMMON_HINT =
  "Tab switch  ←/→ sides  Enter proceed  Esc cancel  Ctrl+S settings";
const BROWSER_HINT = "Space add  ↑/↓ move  Enter open";
const SELECTED_HINT = "Space remove  e settings  d/Delete  Enter proceed";

export interface SplitFilePickerState {
  selected: SelectedFile[];
  currentDir: string;
  leftIndex: number;
  rightIndex: number;
  leftActive: boolean;
}

export async function promptSplitFilePicker(
  startDir: string,
  initialState?: Partial<SplitFilePickerState>
): Promise<SplitFilePickerResult> {
  let currentDir = path.resolve(initialState?.currentDir ?? startDir);
  const selected: SelectedFile[] = initialState?.selected
    ? [...initialState.selected]
    : [];
  let leftIndex = initialState?.leftIndex ?? 0;
  let rightIndex = initialState?.rightIndex ?? 0;
  let leftActive = initialState?.leftActive ?? true;

  const getExistingBasenames = (): string[] =>
    selected.map((s) => s.outputBasename);

  const render = (): void => {
    const entries = listEntries(currentDir);
    const selectedPaths = new Set(selected.map((s) => s.path));

    const leftLines = entries.map((e, i) => {
      const isEpub = e.type === "epub";
      const isInSelection = isEpub && selectedPaths.has(e.path);
      const showCheckbox = isEpub;
      return formatLeftEntry(
        e.name,
        i === leftIndex,
        showCheckbox ? isInSelection : null,
        leftActive,
        getSplitPanelWidths().left
      );
    });

    const rightLines = selected.map((s, i) => {
      const name = path.basename(s.path);
      return formatRightEntry(
        name,
        i === rightIndex,
        !leftActive,
        getSplitPanelWidths().right
      );
    });

    const leftTitle = `Files (${currentDir})`;
    const rightTitle = "Selected";
    const status = `${selected.length} book${selected.length === 1 ? "" : "s"} selected`;
    drawSplitFrame(
      leftTitle,
      leftLines,
      leftIndex,
      leftActive,
      rightTitle,
      rightLines,
      rightIndex,
      status,
      COMMON_HINT,
      BROWSER_HINT,
      SELECTED_HINT
    );
  };

  return new Promise((resolve) => {
    const onKeypress = (
      _ch: unknown,
      key?: { name?: string; ctrl?: boolean; meta?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") {
        cleanup();
        exitNicely();
      }
      if (
        (key?.ctrl || key?.meta) &&
        (key?.name === "s" || key?.name === "S")
      ) {
        cleanup();
        resolve("settings");
        return;
      }
      if (key?.name === "escape") {
        cleanup();
        resolve(null);
        return;
      }
      if (key?.name === "left") {
        leftActive = true;
        render();
        return;
      }
      if (key?.name === "right") {
        leftActive = false;
        render();
        return;
      }
      if (key?.name === "tab") {
        leftActive = !leftActive;
        render();
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        if (leftActive) {
          const entries = listEntries(currentDir);
          const entry = entries[leftIndex];
          if (entry?.type === "parent" || entry?.type === "directory") {
            currentDir = entry.path;
            leftIndex = 0;
            render();
          } else if (entry?.type === "epub" && selected.length === 0) {
            const outputBasename = getUniqueOutputBasename(
              entry.path,
              getExistingBasenames()
            );
            selected.push({
              path: entry.path,
              outputBasename,
              chapterIndices: null,
              includeImages: false,
            });
            cleanup();
            resolve([...selected]);
          } else if (selected.length > 0) {
            cleanup();
            resolve([...selected]);
          }
        } else {
          if (selected.length > 0) {
            cleanup();
            resolve([...selected]);
          }
        }
        return;
      }
      if (key?.name === "space") {
        if (leftActive) {
          const entries = listEntries(currentDir);
          const entry = entries[leftIndex];
          if (!entry || entry.type !== "epub") return;
          const idx = selected.findIndex((s) => s.path === entry.path);
          if (idx >= 0) {
            selected.splice(idx, 1);
            if (
              !leftActive &&
              rightIndex >= selected.length &&
              selected.length > 0
            ) {
              rightIndex = selected.length - 1;
            }
          } else {
            const outputBasename = getUniqueOutputBasename(
              entry.path,
              getExistingBasenames()
            );
            selected.push({
              path: entry.path,
              outputBasename,
              chapterIndices: null,
              includeImages: false,
            });
          }
        } else if (
          selected.length > 0 &&
          rightIndex >= 0 &&
          rightIndex < selected.length
        ) {
          selected.splice(rightIndex, 1);
          if (rightIndex >= selected.length && selected.length > 0) {
            rightIndex = selected.length - 1;
          } else if (selected.length === 0) {
            rightIndex = 0;
          }
        }
        render();
        return;
      }
      if (
        !leftActive &&
        (key?.name === "d" ||
          key?.name === "delete" ||
          key?.name === "backspace")
      ) {
        if (
          selected.length > 0 &&
          rightIndex >= 0 &&
          rightIndex < selected.length
        ) {
          selected.splice(rightIndex, 1);
          if (rightIndex >= selected.length && selected.length > 0) {
            rightIndex = selected.length - 1;
          } else if (selected.length === 0) {
            rightIndex = 0;
          }
        }
        render();
        return;
      }
      if (!leftActive && key?.name === "e") {
        if (
          selected.length > 0 &&
          rightIndex >= 0 &&
          rightIndex < selected.length
        ) {
          cleanup();
          resolve({
            type: "edit",
            selected: [...selected],
            index: rightIndex,
            state: { currentDir, leftIndex, rightIndex, leftActive },
          });
          return;
        }
      }
      if (key?.name === "up" || key?.name === "k") {
        if (leftActive) {
          leftIndex =
            leftIndex <= 0 ? listEntries(currentDir).length - 1 : leftIndex - 1;
        } else {
          rightIndex = rightIndex <= 0 ? selected.length - 1 : rightIndex - 1;
        }
        render();
        return;
      }
      if (key?.name === "down" || key?.name === "j") {
        const entries = listEntries(currentDir);
        if (leftActive) {
          leftIndex = leftIndex >= entries.length - 1 ? 0 : leftIndex + 1;
        } else {
          rightIndex = rightIndex >= selected.length - 1 ? 0 : rightIndex + 1;
        }
        render();
        return;
      }
      const entries = listEntries(currentDir);
      const leftMax = Math.max(0, entries.length - 1);
      const rightMax = Math.max(0, selected.length - 1);
      if (key?.name === "pageup") {
        if (leftActive) {
          leftIndex = Math.max(0, leftIndex - PAGE_JUMP);
        } else {
          rightIndex = Math.max(0, rightIndex - PAGE_JUMP);
        }
        render();
        return;
      }
      if (key?.name === "pagedown") {
        if (leftActive) {
          leftIndex = Math.min(leftMax, leftIndex + PAGE_JUMP);
        } else {
          rightIndex = Math.min(rightMax, rightIndex + PAGE_JUMP);
        }
        render();
        return;
      }
      if (key?.name === "home") {
        if (leftActive) leftIndex = 0;
        else rightIndex = 0;
        render();
        return;
      }
      if (key?.name === "end") {
        if (leftActive) leftIndex = leftMax;
        else rightIndex = rightMax;
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
