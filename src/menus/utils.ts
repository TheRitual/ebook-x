import process from "node:process";
import { getCurrentTheme } from "../themes/context.js";

const MIN_PAGE_SIZE = 10;
const RESERVE_ROWS = 6;

export const PAGE_JUMP = 10;

export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

export function getFrameWidth(): number {
  return typeof process.stdout.columns === "number" &&
    process.stdout.columns > 0
    ? process.stdout.columns
    : 80;
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex -- ANSI escape codes for length calculation
  return s.replace(/\x1b\[[\d;]*m/g, "");
}

export function getPlainLength(str: string): number {
  return stripAnsi(str).length;
}

export function truncateToPlainLength(str: string, maxPlain: number): string {
  const plain = stripAnsi(str);
  if (plain.length <= maxPlain) return str;
  let count = 0;
  let result = "";
  let i = 0;
  while (i < str.length && count < maxPlain) {
    if (str[i] === "\x1b" && str[i + 1] === "[") {
      const end = str.indexOf("m", i + 2);
      result += end === -1 ? str[i]! : str.slice(i, end + 1);
      i = end === -1 ? i + 1 : end + 1;
      continue;
    }
    result += str[i];
    count++;
    i++;
  }
  const reset = "\x1b[0m";
  return result + (result.endsWith(reset) ? "" : reset);
}

export function sliceByPlainRange(
  str: string,
  start: number,
  length: number
): string {
  const plain = stripAnsi(str);
  if (start >= plain.length || length <= 0) return "";
  const end = Math.min(start + length, plain.length);
  let count = 0;
  let collect = 0;
  let result = "";
  let i = 0;
  while (i < str.length && collect < end - start) {
    if (str[i] === "\x1b" && str[i + 1] === "[") {
      const m = str.indexOf("m", i + 2);
      const seq = m === -1 ? str[i]! : str.slice(i, m + 1);
      if (count >= start) result += seq;
      i = m === -1 ? i + 1 : m + 1;
      continue;
    }
    if (count >= start) {
      result += str[i];
      collect++;
    }
    count++;
    i++;
  }
  const reset = "\x1b[0m";
  return result + (result.endsWith(reset) ? "" : reset);
}

function getFrame(): ReturnType<typeof getCurrentTheme>["frameStyle"] {
  return getCurrentTheme().frameStyle;
}

export function frameMessage(message: string): string {
  const w = getFrameWidth();
  const f = getFrame();
  const inner = Math.max(4, w - 4);
  const padded = message.slice(0, inner).padEnd(inner);
  return (
    f.topLeft +
    f.horizontal.repeat(w - 2) +
    f.topRight +
    "\n" +
    f.vertical +
    " " +
    padded +
    " " +
    f.vertical +
    "\n" +
    f.bottomLeft +
    f.horizontal.repeat(w - 2) +
    f.bottomRight
  );
}

export function frameTop(width: number): string {
  const f = getFrame();
  return f.topLeft + f.horizontal.repeat(width - 2) + f.topRight;
}

export function frameBottom(width: number): string {
  const f = getFrame();
  return f.bottomLeft + f.horizontal.repeat(width - 2) + f.bottomRight;
}

export function frameLine(
  line: string,
  width: number,
  scrollbarChar?: string
): string {
  const f = getFrame();
  const inner = scrollbarChar !== undefined ? width - 5 : width - 4;
  const plain = stripAnsi(line);
  const pad = plain.length < inner ? " ".repeat(inner - plain.length) : "";
  const right =
    scrollbarChar !== undefined ? scrollbarChar + f.vertical : " " + f.vertical;
  return f.vertical + " " + line + pad + right;
}

export function frameMultipleLines(lines: string[]): string {
  const w = getFrameWidth();
  return (
    frameTop(w) +
    "\n" +
    lines.map((line) => frameLine(line, w)).join("\n") +
    "\n" +
    frameBottom(w)
  );
}

export function getSelectPageSize(): number {
  const rows =
    typeof process.stdout.rows === "number" && process.stdout.rows > 0
      ? process.stdout.rows
      : 24;
  return Math.max(MIN_PAGE_SIZE, rows - RESERVE_ROWS);
}

export class ResizeError extends Error {
  override name = "ResizeError";
  constructor() {
    super("RESIZE");
  }
}

export function wrapSelectWithResize<T>(
  promise: Promise<T> & { cancel: () => void }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    promise.then(resolve).catch(reject);
    const onResize = (): void => {
      promise.cancel();
      reject(new ResizeError());
    };
    process.stdout.on("resize", onResize);
    promise.finally(() => {
      process.stdout.off("resize", onResize);
    });
  });
}
