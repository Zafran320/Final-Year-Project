import { describe, it, expect } from "vitest";
import {
  urduToRoman,
  devanagariToRoman,
  ensureRomanScript,
  containsUrduOrHindiScript,
} from "./romanTransliterator";

describe("Roman Transliterator Engine", () => {
  describe("containsUrduOrHindiScript", () => {
    it("detects Perso-Arabic Urdu script accurately", () => {
      expect(containsUrduOrHindiScript("السلام علیکم")).toBe(true);
      expect(containsUrduOrHindiScript("میرا نام حمزہ ہے")).toBe(true);
    });

    it("detects Hindi Devanagari script accurately", () => {
      expect(containsUrduOrHindiScript("नमस्ते")).toBe(true);
      expect(containsUrduOrHindiScript("डेटाबेस")).toBe(true);
    });

    it("returns false for English or existing Roman Urdu", () => {
      expect(containsUrduOrHindiScript("Hello world")).toBe(false);
      expect(containsUrduOrHindiScript("As-salamu alaykum, main theek hoon")).toBe(false);
      expect(containsUrduOrHindiScript("Redis caching latency 20ms")).toBe(false);
    });
  });

  describe("urduToRoman", () => {
    it("converts common greetings and idioms to Roman Urdu", () => {
      expect(urduToRoman("السلام علیکم")).toBe("As-salamu alaykum");
      expect(urduToRoman("وعلیکم السلام")).toBe("Walaikum assalam");
      expect(urduToRoman("شکریہ")).toBe("Shukriya");
      expect(urduToRoman("جی بالکل")).toBe("Ji bilkul");
      expect(urduToRoman("ٹھیک ہے")).toBe("Theek hai");
    });

    it("converts complete Urdu sentences into readable Roman Urdu", () => {
      const urdu = "میرا نام احمد ہے اور میں تیار ہوں۔";
      const roman = urduToRoman(urdu);
      expect(roman.toLowerCase()).toContain("mera");
      expect(roman.toLowerCase()).toContain("naam");
      expect(roman.toLowerCase()).toContain("hai");
      expect(roman.toLowerCase()).toContain("tayyar");
    });

    it("preserves embedded English technical words", () => {
      const mixed = "میں نے Redis اور Kafka پر کام کیا ہے۔";
      const roman = urduToRoman(mixed);
      expect(roman).toContain("Redis");
      expect(roman).toContain("Kafka");
      expect(roman.toLowerCase()).toContain("main");
      expect(roman.toLowerCase()).toContain("kaam");
    });
  });

  describe("devanagariToRoman", () => {
    it("converts Hindi phrases to Roman Hindi/Urdu", () => {
      expect(devanagariToRoman("नमस्ते")).toBe("Namaste");
      expect(devanagariToRoman("धन्यवाद")).toBe("Dhanyawaad");
      expect(devanagariToRoman("हाँ ठीक है")).toBe("Haan theek hai");
    });

    it("converts technical terms in Devanagari", () => {
      expect(devanagariToRoman("डेटाबेस")).toBe("Database");
      expect(devanagariToRoman("सर्वर")).toBe("Server");
    });
  });

  describe("realistic interview transcripts", () => {
    it("romanizes Urdu answers while preserving embedded English terms", () => {
      expect(
        ensureRomanScript("میں نے اپنے project میں React اور Node.js پر کام کیا")
      ).toBe("Maine apne project main React aur Node.js par kaam kiya");
      expect(
        ensureRomanScript("میں نے database performance بہتر کرنے کے لیے indexes استعمال کیے")
      ).toBe("Maine database performance behtar karne ke liye indexes istemal kiye");
      expect(
        ensureRomanScript("میں اس مسئلے کو پہلے reproduce کرتا ہوں پھر logs اور metrics دیکھتا ہوں")
      ).toBe("Main is maslay ko pehlay reproduce karta hoon phir logs aur metrics dekhta hoon");
    });
  });

  describe("ensureRomanScript", () => {
    it("always renders Urdu script in Roman script", () => {
      const result = ensureRomanScript("السلام علیکم کیا حال ہے؟");
      expect(result).not.toMatch(/[\u0600-\u06FF]/);
      expect(result.toLowerCase()).toContain("as-salamu alaykum");
      expect(result.toLowerCase()).toContain("kya haal hai");
    });

    it("always renders Hindi Devanagari in Roman script", () => {
      const result = ensureRomanScript("नमस्ते, मेरा नाम रोहन है।");
      expect(result).not.toMatch(/[\u0900-\u097F]/);
      expect(result.toLowerCase()).toContain("namaste");
      expect(result.toLowerCase()).toContain("mera naam");
    });

    it("leaves English and Roman Urdu intact", () => {
      expect(ensureRomanScript("I have 4 years of experience in Node.js.")).toBe(
        "I have 4 years of experience in Node.js."
      );
      expect(ensureRomanScript("Haan sir, main backend developer hoon.")).toBe(
        "Haan sir, main backend developer hoon."
      );
    });

    it("capitalizes the first letter for clean presentation", () => {
      expect(ensureRomanScript("theek hai, main ready hoon")).toBe(
        "Theek hai, main ready hoon"
      );
    });
  });
});
