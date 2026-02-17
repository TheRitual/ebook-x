// eslint-disable-next-line no-control-regex -- intentional: strip control chars from path segments
const UNSAFE_FILENAME = /[<>:"/\\|?*\x00-\x1f]/g;
const DEFAULT_BASENAME = "output";
const DEFAULT_PREFIX = "chapter";

function collapseUnderscores(s: string): string {
  return s.replace(/_+/g, "_");
}

function trimDotsAndUnderscores(s: string): string {
  return s.replace(/^[._]+|[._]+$/g, "");
}

export function sanitizePathSegment(
  segment: string,
  defaultValue: string = DEFAULT_BASENAME
): string {
  if (typeof segment !== "string") return defaultValue;
  let out = segment
    .trim()
    // eslint-disable-next-line no-control-regex -- intentional: strip null bytes
    .replace(/\x00/g, "")
    .replace(UNSAFE_FILENAME, "_")
    .replace(/\.\./g, "_");
  out = collapseUnderscores(trimDotsAndUnderscores(out));
  return out.length > 0 ? out : defaultValue;
}

export function sanitizeOutputBasename(name: string): string {
  return sanitizePathSegment(name.trim(), DEFAULT_BASENAME);
}

export function sanitizeChapterFileNamePrefix(prefix: string): string {
  return sanitizePathSegment(prefix.trim(), DEFAULT_PREFIX);
}
