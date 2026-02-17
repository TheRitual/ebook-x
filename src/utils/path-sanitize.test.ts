import { describe, it, expect } from "vitest";
import {
  sanitizePathSegment,
  sanitizeOutputBasename,
  sanitizeChapterFileNamePrefix,
} from "./path-sanitize.js";

describe("sanitizePathSegment", () => {
  it("replaces path separators and unsafe chars with underscore", () => {
    expect(sanitizePathSegment("foo/bar")).toBe("foo_bar");
    expect(sanitizePathSegment("foo\\bar")).toBe("foo_bar");
    expect(sanitizePathSegment("a<>:*?|b")).toBe("a_b");
  });

  it("replaces .. with underscore", () => {
    expect(sanitizePathSegment("..")).toBe("output");
    expect(sanitizePathSegment("foo..bar")).toBe("foo_bar");
  });

  it("returns default when empty after sanitization", () => {
    expect(sanitizePathSegment("")).toBe("output");
    expect(sanitizePathSegment("...")).toBe("output");
    expect(sanitizePathSegment("  ", "chapter")).toBe("chapter");
  });

  it("trims leading and trailing dots/underscores", () => {
    expect(sanitizePathSegment(".foo.")).toBe("foo");
    expect(sanitizePathSegment("_bar_")).toBe("bar");
  });
});

describe("sanitizeOutputBasename", () => {
  it("sanitizes and defaults to output when empty", () => {
    expect(sanitizeOutputBasename("my-book")).toBe("my-book");
    expect(sanitizeOutputBasename("  ")).toBe("output");
    expect(sanitizeOutputBasename("foo/../bar")).toBe("foo_bar");
  });
});

describe("sanitizeChapterFileNamePrefix", () => {
  it("sanitizes and defaults to chapter when empty", () => {
    expect(sanitizeChapterFileNamePrefix("ch")).toBe("ch");
    expect(sanitizeChapterFileNamePrefix("  ")).toBe("chapter");
  });
});
