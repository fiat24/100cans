import { describe, it, expect, vi } from "vitest";
import { decodeHTMLEntities } from "./blogFetcher";

describe("blogFetcher", () => {
  describe("decodeHTMLEntities", () => {
    it("should decode common HTML entities", () => {
      expect(decodeHTMLEntities("Hello &amp; World")).toBe("Hello & World");
      expect(decodeHTMLEntities("&lt;tag&gt;")).toBe("<tag>");
      expect(decodeHTMLEntities("&quot;quoted&quot;")).toBe('"quoted"');
      expect(decodeHTMLEntities("&#39;single&#39;")).toBe("'single'");
    });

    it("should handle multiple entities in one string", () => {
      expect(decodeHTMLEntities("&lt;div&gt; &amp; &quot;text&quot;")).toBe(
        '<div> & "text"'
      );
    });

    it("should leave non-entity text unchanged", () => {
      expect(decodeHTMLEntities("Plain text")).toBe("Plain text");
    });

    it("should handle nbsp entities", () => {
      expect(decodeHTMLEntities("Word&nbsp;Space")).toBe("Word Space");
    });
  });
});
