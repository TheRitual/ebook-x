import { describe, it, expect } from "vitest";
import { getDefaultIncludeImages } from "./default-include-images.js";
import { DEFAULT_SETTINGS } from "../../settings/types.js";

describe("getDefaultIncludeImages", () => {
  it("returns false when formats is empty", () => {
    expect(getDefaultIncludeImages(DEFAULT_SETTINGS, [])).toBe(false);
  });

  it("returns false when first format is txt", () => {
    expect(
      getDefaultIncludeImages(
        { ...DEFAULT_SETTINGS, defaultFormats: ["txt"] },
        ["txt"]
      )
    ).toBe(false);
  });

  it("returns format setting for md", () => {
    expect(getDefaultIncludeImages(DEFAULT_SETTINGS, ["md"])).toBe(
      DEFAULT_SETTINGS.formats.md.includeImages
    );
    const withImages = {
      ...DEFAULT_SETTINGS,
      formats: {
        ...DEFAULT_SETTINGS.formats,
        md: { ...DEFAULT_SETTINGS.formats.md, includeImages: true },
      },
    };
    expect(getDefaultIncludeImages(withImages, ["md"])).toBe(true);
  });

  it("returns format setting for html", () => {
    const withImages = {
      ...DEFAULT_SETTINGS,
      formats: {
        ...DEFAULT_SETTINGS.formats,
        html: { ...DEFAULT_SETTINGS.formats.html, includeImages: true },
      },
    };
    expect(getDefaultIncludeImages(withImages, ["html"])).toBe(true);
  });

  it("returns format setting for json", () => {
    const withImages = {
      ...DEFAULT_SETTINGS,
      formats: {
        ...DEFAULT_SETTINGS.formats,
        json: { ...DEFAULT_SETTINGS.formats.json, includeImages: true },
      },
    };
    expect(getDefaultIncludeImages(withImages, ["json"])).toBe(true);
  });

  it("uses first format when multiple are given", () => {
    expect(
      getDefaultIncludeImages(DEFAULT_SETTINGS, ["md", "html", "json"])
    ).toBe(DEFAULT_SETTINGS.formats.md.includeImages);
    const withMdImages = {
      ...DEFAULT_SETTINGS,
      formats: {
        ...DEFAULT_SETTINGS.formats,
        md: { ...DEFAULT_SETTINGS.formats.md, includeImages: true },
      },
    };
    expect(getDefaultIncludeImages(withMdImages, ["md", "html"])).toBe(true);
  });
});
