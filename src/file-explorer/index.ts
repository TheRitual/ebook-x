import { select } from "@inquirer/prompts";
import path from "node:path";
import process from "node:process";
import { listEntries } from "./utils.js";
import type { FileExplorerEntry } from "./types.js";

type SelectWithCancel = Promise<string> & { cancel: () => void };

export async function promptSelectEpubFile(
  startDir: string
): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  for (;;) {
    const entries = listEntries(currentDir);
    const parentEntry = entries.find((e) => e.type === "parent");
    const browseEntries = entries.filter((e) => e.type !== "parent");

    const choices = [
      ...(parentEntry
        ? [
            {
              name: parentEntry.name,
              value: parentEntry.path,
              description: "Go to parent directory",
            },
          ]
        : []),
      ...browseEntries.map((e) => ({
        name: e.name,
        value: e.path,
        description: e.type === "directory" ? "Open directory" : "Select EPUB",
      })),
    ];

    const promise = select({
      message: `Select file or directory (in ${currentDir})`,
      choices,
      loop: false,
      theme: {
        style: {
          keysHelpTip: (keys: [string, string][]) =>
            [...keys, ["Esc", "cancel"] as [string, string]]
              .map(([key, action]) => `${key} ${action}`)
              .join(" • "),
        },
      },
    });

    if (process.stdin.isTTY) {
      const onKeypress = (_ch: unknown, key?: { name?: string }): void => {
        if (key?.name === "escape") (promise as SelectWithCancel).cancel();
      };
      process.stdin.on("keypress", onKeypress);
      promise.finally(() => {
        process.stdin.off("keypress", onKeypress);
      });
    }

    let choice: string;
    try {
      choice = await promise;
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === "CancelPromptError" || err.name === "ExitPromptError")
      )
        return null;
      throw err;
    }

    const selected = entries.find((e) => e.path === choice) as
      | FileExplorerEntry
      | undefined;
    if (!selected) continue;

    if (selected.type === "epub") return selected.path;
    if (selected.type === "parent" || selected.type === "directory") {
      currentDir = selected.path;
    }
  }
}
