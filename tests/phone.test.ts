import { describe, it, expect } from "vitest";
import { normalizePhone, isValidPhone, whatsappLink } from "@/lib/phone";

describe("normalizePhone (E.164, Bangladesh default)", () => {
  it("normalizes common BD local formats to the same E.164 number", () => {
    const expected = "+8801712345678";
    expect(normalizePhone("01712345678")).toBe(expected);
    expect(normalizePhone("1712345678")).toBe(expected);
    expect(normalizePhone("+8801712345678")).toBe(expected);
    expect(normalizePhone("8801712345678")).toBe(expected);
    expect(normalizePhone("0088 01712-345678")).toBe(expected);
    expect(normalizePhone("  +880 1712 345 678 ")).toBe(expected);
  });

  it("is the basis of dedup-by-phone: differing inputs collapse to one identity", () => {
    const a = normalizePhone("01712345678");
    const b = normalizePhone("+8801712345678");
    const c = normalizePhone("8801712345678");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("abcd")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });

  it("isValidPhone reflects validity", () => {
    expect(isValidPhone("01712345678")).toBe(true);
    expect(isValidPhone("nope")).toBe(false);
  });

  it("builds a wa.me link from any format", () => {
    expect(whatsappLink("01712345678")).toBe("https://wa.me/8801712345678");
    expect(whatsappLink("01712345678", "hi")).toBe(
      "https://wa.me/8801712345678?text=hi"
    );
  });
});
