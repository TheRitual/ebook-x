import path from "node:path";
import { listEntries } from "./utils.js";
import type { FileExplorerEntry } from "./types.js";
import { clearScreen } from "../menus/utils.js";
import { promptFramedSelectLoop } from "../menus/framed-select.js";
import {
  promptSplitFilePicker,
  type SplitFilePickerResult,
} from "./split-file-picker.js";
import { promptPerFileSettings } from "./per-file-settings-prompt.js";
import type { SelectedFile } from "./selected-file-types.js";

export type FileSelectionResult = SelectedFile[] | null | "settings";

const FILE_HINT = " ↑/↓ move  Enter select  Esc cancel  Ctrl/Cmd+S settings";

export async function promptSelectEpubFiles(
  startDir: string
): Promise<FileSelectionResult> {
  let state: import("./split-file-picker.js").SplitFilePickerState | undefined;

  for (;;) {
    const result = await promptSplitFilePicker(startDir, state);

    if (result === null || result === "settings") return result;
    if (Array.isArray(result) && !("type" in result)) return result;

    const edit = result as Extract<SplitFilePickerResult, { type: "edit" }>;
    if (edit.type === "edit") {
      const existingBasenames = edit.selected
        .map((s) => s.outputBasename)
        .filter((_, i) => i !== edit.index);
      const updated = await promptPerFileSettings(
        edit.selected[edit.index]!,
        existingBasenames
      );
      const newSelected = [...edit.selected];
      newSelected[edit.index] = updated;
      state = {
        ...edit.state,
        selected: newSelected,
      };
    }
  }
}

export async function promptSelectEpubFile(
  startDir: string
): Promise<string | null | "settings"> {
  clearScreen();
  let currentDir = path.resolve(startDir);

  const getTitle = (): string => `Select file or directory (in ${currentDir})`;

  const getChoices = (): { name: string; value: string }[] => {
    const entries = listEntries(currentDir);
    const parentEntry = entries.find((e) => e.type === "parent");
    const browseEntries = entries.filter((e) => e.type !== "parent");
    return [
      ...(parentEntry
        ? [{ name: parentEntry.name, value: parentEntry.path }]
        : []),
      ...browseEntries.map((e) => ({ name: e.name, value: e.path })),
    ];
  };

  const result = await promptFramedSelectLoop<string | "settings">(
    getTitle,
    getChoices,
    FILE_HINT,
    (key, selectedValue) => {
      if (key === "escape") return null;
      if (key === "ctrl+s") return "settings";
      if (key === "enter" && selectedValue) {
        const entries = listEntries(currentDir);
        const selected = entries.find((e) => e.path === selectedValue) as
          | FileExplorerEntry
          | undefined;
        if (!selected) return null;
        if (selected.type === "epub") return selected.path;
        if (selected.type === "parent" || selected.type === "directory") {
          currentDir = selected.path;
          return "continue";
        }
      }
      return "continue";
    }
  );

  return result;
}
