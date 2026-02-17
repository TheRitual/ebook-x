import path from "node:path";
import { sanitizeOutputBasename } from "../../utils/path-sanitize.js";

export function getUniqueOutputBasename(
  filePath: string,
  existingBasenames: string[]
): string {
  const raw = path.basename(filePath, path.extname(filePath));
  const basename = sanitizeOutputBasename(raw || "output");
  let candidate = basename;
  let n = 1;
  while (existingBasenames.includes(candidate)) {
    candidate = `${basename}-${n}`;
    n++;
  }
  return candidate;
}

export function basenameFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}
