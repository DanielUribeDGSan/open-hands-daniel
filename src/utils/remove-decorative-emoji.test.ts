import { describe, expect, it } from "vitest";
import { removeDecorativeEmoji } from "./remove-decorative-emoji";

describe("removeDecorativeEmoji", () => {
  it("removes decorative emoji without changing normal Spanish or code", () => {
    expect(
      removeDecorativeEmoji(
        "Listo ✅\nAplicación rápida 🚀✨\nconst ok = true;",
      ),
    ).toBe("Listo\nAplicación rápida\nconst ok = true;");
  });
});
