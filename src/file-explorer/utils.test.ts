import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { listEntries, isEpubPath } from "./utils.js";

describe("isEpubPath", () => {
  it("returns true for .epub extension", () => {
    expect(isEpubPath("book.epub")).toBe(true);
    expect(isEpubPath("/a/b.epub")).toBe(true);
  });

  it("returns true for uppercase extension", () => {
    expect(isEpubPath("book.EPUB")).toBe(true);
  });

  it("returns false for non-epub", () => {
    expect(isEpubPath("book.txt")).toBe(false);
    expect(isEpubPath("epub")).toBe(false);
  });
});

describe("listEntries", () => {
  it("returns parent entry when not at root", () => {
    const tmp = os.tmpdir();
    const entries = listEntries(tmp);
    const parent = entries.find((e) => e.type === "parent");
    expect(parent).toBeDefined();
    expect(parent?.name).toBe("..");
  });

  it("includes directories and epub files only", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epub-x-test-"));
    try {
      fs.writeFileSync(path.join(dir, "a.epub"), "");
      fs.writeFileSync(path.join(dir, "b.txt"), "");
      fs.mkdirSync(path.join(dir, "subdir"), { recursive: true });
      const entries = listEntries(dir);
      const names = entries.map((e) => e.name);
      expect(names).toContain("subdir/");
      expect(names).toContain("a.epub");
      expect(names).not.toContain("b.txt");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
