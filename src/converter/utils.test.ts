import { describe, it, expect } from "vitest";
import {
  applyPostOptions,
  decodeHtmlEntities,
  htmlToMarkdown,
  htmlToPlainText,
  removeImageLinksFromMarkdown,
  replaceEmDash,
  sanitizeWhitespace,
} from "./utils.js";

describe("htmlToPlainText", () => {
  it("strips HTML tags", () => {
    expect(htmlToPlainText("<p>Hello</p>")).toBe("Hello");
  });

  it("collapses whitespace", () => {
    expect(htmlToPlainText("<p>  a   b  </p>")).toBe("a b");
  });

  it("decodes common entities including &#160;", () => {
    expect(htmlToPlainText("&amp; &lt; &gt; &quot;")).toBe('& < > "');
    expect(htmlToPlainText("z&#160;Riverrun")).toBe("z Riverrun");
  });

  it("removes style and script tags", () => {
    expect(htmlToPlainText("<style>body{}</style>foo")).toBe("foo");
    expect(htmlToPlainText("<script>alert(1)</script>bar")).toBe("bar");
  });
});

describe("decodeHtmlEntities", () => {
  it("decodes &#160; to space", () => {
    expect(decodeHtmlEntities("z&#160;Riverrun")).toBe("z Riverrun");
  });

  it("decodes decimal and hex entities", () => {
    expect(decodeHtmlEntities("&#32;")).toBe(" ");
    expect(decodeHtmlEntities("&#x20;")).toBe(" ");
  });
});

describe("replaceEmDash", () => {
  it("replaces — with -", () => {
    expect(replaceEmDash("a — b")).toBe("a - b");
  });
});

describe("sanitizeWhitespace", () => {
  it("normalizes line breaks and spaces", () => {
    expect(sanitizeWhitespace("a  b\t\tc")).toBe("a b c");
  });

  it("replaces nbsp with space", () => {
    expect(sanitizeWhitespace("a\u00A0b")).toBe("a b");
  });

  it("normalizes spaces and trims line content", () => {
    expect(sanitizeWhitespace("  a  b  \t  c  ")).toBe("a b c");
  });
});

describe("removeImageLinksFromMarkdown", () => {
  it("removes image markdown", () => {
    expect(removeImageLinksFromMarkdown("text ![alt](url.jpg) more")).toBe(
      "text  more"
    );
  });

  it("removes multiple images", () => {
    const md = "a ![x](1.png) b ![y](2.jpg) c";
    expect(removeImageLinksFromMarkdown(md)).toBe("a  b  c");
  });

  it("collapses triple newlines to double", () => {
    expect(removeImageLinksFromMarkdown("a\n\n\nb")).toBe("a\n\nb");
  });
});

describe("applyPostOptions", () => {
  it("applies only emDashToHyphen when true", () => {
    expect(
      applyPostOptions("a — b", {
        emDashToHyphen: true,
        sanitizeWhitespace: false,
      })
    ).toBe("a - b");
  });

  it("applies only sanitizeWhitespace when true", () => {
    expect(
      applyPostOptions("a  b\tc", {
        emDashToHyphen: false,
        sanitizeWhitespace: true,
      })
    ).toBe("a b c");
  });

  it("applies both when both true", () => {
    expect(
      applyPostOptions("a — b  c", {
        emDashToHyphen: true,
        sanitizeWhitespace: true,
      })
    ).toBe("a - b c");
  });

  it("returns unchanged text when both false", () => {
    const text = "a — b  c";
    expect(
      applyPostOptions(text, {
        emDashToHyphen: false,
        sanitizeWhitespace: false,
      })
    ).toBe(text);
  });
});

describe("htmlToMarkdown", () => {
  it("converts headings to atx style", () => {
    const md = htmlToMarkdown("<h1>Title</h1>");
    expect(md).toContain("# Title");
  });

  it("converts paragraphs to newline-separated text", () => {
    const md = htmlToMarkdown("<p>One</p><p>Two</p>");
    expect(md).toMatch(/One/);
    expect(md).toMatch(/Two/);
  });
});
