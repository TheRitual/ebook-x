import readline from "node:readline";
import process from "node:process";
import { exitNicely } from "../exit.js";
import type { OutputFormat } from "./types.js";
import {
  styleMessage,
  styleHint,
  styleHintTips,
  styleSelectedRow,
} from "./colors.js";
import {
  clearScreen,
  getFrameWidth,
  frameTop,
  frameBottom,
  frameLine,
  PAGE_JUMP,
} from "./utils.js";

const FORMAT_OPTIONS: { value: OutputFormat; name: string }[] = [
  { value: "txt", name: "Plain text (.txt)" },
  { value: "md", name: "Markdown (.md)" },
  { value: "json", name: "JSON (.json)" },
  { value: "html", name: "HTML (.html)" },
];

const ORDER: OutputFormat[] = ["txt", "md", "json", "html"];

export function promptOutputFormatsMulti(
  defaultFormats: OutputFormat[]
): Promise<OutputFormat[] | null> {
  const selected = new Set<OutputFormat>(
    defaultFormats.length > 0 ? defaultFormats : [ORDER[0]!]
  );
  let index = 0;

  return new Promise((resolve) => {
    const render = (): void => {
      const width = getFrameWidth();
      const lines: string[] = [
        styleMessage("Output format(s) – select one or more"),
        "",
        ...FORMAT_OPTIONS.map((opt, i) => {
          const isCursor = i === index;
          const checked = selected.has(opt.value);
          const box = checked ? "✓" : "○";
          const bullet = isCursor ? "▸ " : "  ";
          const content = `${bullet}${box} ${opt.name}`;
          const styled = isCursor ? styleSelectedRow(content) : content;
          return styled;
        }),
        "",
        styleHint(
          `Selected: ${ORDER.filter((f) => selected.has(f)).join(", ") || "(none)"}`
        ),
        styleHintTips("Space toggle  Enter confirm (at least one)  Esc cancel"),
      ];
      clearScreen();
      process.stdout.write(frameTop(width) + "\n");
      for (const line of lines) {
        process.stdout.write(frameLine(line, width) + "\n");
      }
      process.stdout.write(frameBottom(width) + "\n");
    };

    const onKeypress = (
      ch: unknown,
      key?: { name?: string; ctrl?: boolean }
    ): void => {
      if (key?.ctrl && key?.name === "c") exitNicely();
      if (key?.name === "escape" || ch === "\x1b") {
        cleanup();
        resolve(null);
        return;
      }
      if (key?.name === "up" || key?.name === "k") {
        index = index <= 0 ? FORMAT_OPTIONS.length - 1 : index - 1;
        render();
        return;
      }
      if (key?.name === "down" || key?.name === "j") {
        index = index >= FORMAT_OPTIONS.length - 1 ? 0 : index + 1;
        render();
        return;
      }
      const maxIdx = Math.max(0, FORMAT_OPTIONS.length - 1);
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
      if (key?.name === "space") {
        const opt = FORMAT_OPTIONS[index];
        if (opt) {
          if (selected.has(opt.value)) {
            if (selected.size > 1) selected.delete(opt.value);
          } else {
            selected.add(opt.value);
          }
        }
        render();
        return;
      }
      if (key?.name === "return" || key?.name === "enter") {
        const chosen = ORDER.filter((f) => selected.has(f));
        if (chosen.length > 0) {
          cleanup();
          resolve(chosen);
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
