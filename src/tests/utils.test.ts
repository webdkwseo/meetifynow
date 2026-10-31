import { describe, expect, it } from "vitest";
import { fmt, plural, textOn } from "../app/lib/utils";

describe("dictionary helpers", () => {
  it("fills placeholders and keeps unknown ones", () => {
    expect(fmt("{count}/{total} odpowiedzi", { count: 2, total: 5 })).toBe(
      "2/5 odpowiedzi",
    );
    expect(fmt("Hi {name}", {})).toBe("Hi {name}");
  });

  it("picks Polish plural forms", () => {
    const forms = {
      one: "{count} odpowiedź",
      few: "{count} odpowiedzi (few)",
      many: "{count} odpowiedzi (many)",
      other: "{count} odpowiedzi",
    };
    expect(plural(forms, 1, "pl")).toBe("1 odpowiedź");
    expect(plural(forms, 3, "pl")).toBe("3 odpowiedzi (few)");
    expect(plural(forms, 5, "pl")).toBe("5 odpowiedzi (many)");
    expect(plural({ one: "{count} answer", other: "{count} answers" }, 2, "en")).toBe(
      "2 answers",
    );
  });
});

describe("textOn", () => {
  it("uses white on dark and dark on light backgrounds", () => {
    expect(textOn("#004466")).toBe("#ffffff");
    expect(textOn("#6366f1")).toBe("#ffffff");
    expect(textOn("#f59e0b")).toBe("#0f172a");
    expect(textOn("#ffffff")).toBe("#0f172a");
  });
});
