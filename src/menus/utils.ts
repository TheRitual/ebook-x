import process from "node:process";

const MIN_PAGE_SIZE = 10;
const RESERVE_ROWS = 6;

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

export function frameMessage(message: string): string {
  const w = getFrameWidth();
  const inner = Math.max(4, w - 4);
  const padded = message.slice(0, inner).padEnd(inner);
  return (
    "╭" +
    "─".repeat(w - 2) +
    "╮\n│ " +
    padded +
    " │\n╰" +
    "─".repeat(w - 2) +
    "╯"
  );
}

export function frameTop(width: number): string {
  return "╭" + "─".repeat(width - 2) + "╮";
}

export function frameBottom(width: number): string {
  return "╰" + "─".repeat(width - 2) + "╯";
}

export function frameLine(line: string, width: number): string {
  const inner = width - 4;
  const plain = stripAnsi(line);
  const pad = plain.length < inner ? " ".repeat(inner - plain.length) : "";
  return "│ " + line + pad + " │";
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
