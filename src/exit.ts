import process from "node:process";

export function exitNicely(): never {
  process.stdout.write("\nBye.\n");
  process.exit(0);
}
