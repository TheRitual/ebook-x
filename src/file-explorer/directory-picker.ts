import path from "node:path";
import fs from "node:fs";
import type { FileExplorerEntry } from "./types.js";
import { clearScreen } from "../menus/utils.js";
import { promptFramedSelectLoop } from "../menus/framed-select.js";

function listDirectoryEntries(dir: string): FileExplorerEntry[] {
  const resolved = path.resolve(dir);
  const entries: FileExplorerEntry[] = [];
  const parentDir = path.dirname(resolved);
  if (parentDir !== resolved) {
    entries.push({ type: "parent", name: "..", path: parentDir });
  }
  if (!fs.existsSync(resolved)) return entries;
  const names = fs.readdirSync(resolved, { withFileTypes: true });
  const dirs = names
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => ({
      type: "directory" as const,
      name: d.name + "/",
      path: path.join(resolved, d.name),
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  return [...entries, ...dirs];
}

const DIR_HINT = " ↑/↓ move  Enter select  Esc cancel";

export async function promptSelectDirectory(
  startDir: string
): Promise<string | null> {
  clearScreen();
  let currentDir = path.resolve(startDir);

  const getTitle = (): string => `Choose output directory (${currentDir})`;

  const getChoices = (): { name: string; value: string }[] => {
    const entries = listDirectoryEntries(currentDir);
    return [
      { name: "Use this directory", value: "__current__" },
      ...entries.map((e) => ({ name: e.name, value: e.path })),
    ];
  };

  return promptFramedSelectLoop<string>(
    getTitle,
    getChoices,
    DIR_HINT,
    (key, selectedValue) => {
      if (key === "escape") return null;
      if (key === "enter" && selectedValue) {
        if (selectedValue === "__current__") return currentDir;
        const entries = listDirectoryEntries(currentDir);
        const selected = entries.find((e) => e.path === selectedValue);
        if (selected?.type === "parent" || selected?.type === "directory") {
          currentDir = selected.path;
          return "continue";
        }
      }
      return "continue";
    }
  );
}
