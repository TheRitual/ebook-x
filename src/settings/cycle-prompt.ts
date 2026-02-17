import readline from "node:readline";
import process from "node:process";

export function promptCycleValue<T>(options: {
  message: string;
  currentValue: T;
  options: { value: T; label: string }[];
  valueToLabel: (v: T) => string;
}): Promise<T> {
  const { message, currentValue, options: opts, valueToLabel } = options;
  const getNext = (v: T): T => {
    const i = opts.findIndex((o) => o.value === v);
    const next = (i + 1) % opts.length;
    return opts[next]!.value;
  };

  return new Promise((resolve) => {
    let value = currentValue;

    const render = (): void => {
      const line = `${message}: ${valueToLabel(value)}  [Space to cycle, Enter to confirm]`;
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 1);
      process.stdout.write(line);
    };

    const onKeypress = (_ch: unknown, key?: { name?: string }): void => {
      if (key?.name === "return" || key?.name === "enter") {
        cleanup();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (key?.name === "space") {
        value = getNext(value);
        render();
      }
    };

    const cleanup = (): void => {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("keypress", onKeypress);

    render();
  });
}
