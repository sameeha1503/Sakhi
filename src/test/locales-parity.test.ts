import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { LANGUAGES } from "../i18n";

function getLeafKeys(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, getLeafKeys(value as Record<string, unknown>, fullPath));
    } else if (typeof value === "string") {
      result[fullPath] = value;
    }
  }
  return result;
}

function extractPlaceholders(str: string): string[] {
  const matches = str.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.map((m) => m.slice(2, -2).trim()).sort();
}

describe("i18n locale parity", () => {
  const localesDir = path.resolve(__dirname, "../i18n/locales");
  const enPath = path.join(localesDir, "en.json");
  const enRaw = JSON.parse(fs.readFileSync(enPath, "utf-8"));
  const enKeys = getLeafKeys(enRaw);
  const enKeyList = Object.keys(enKeys).sort();

  it("defines all supported languages in LANGUAGES constant", () => {
    const expectedCodes = ["en", "hi", "te", "ta", "kn", "ml", "mr", "bn", "gu", "pa", "or"];
    const actualCodes = LANGUAGES.map((l) => l.code);
    expect(actualCodes.sort()).toEqual(expectedCodes.sort());
  });

  for (const lang of LANGUAGES) {
    if (lang.code === "en") continue;

    describe(`locale: ${lang.code} (${lang.label})`, () => {
      const filePath = path.join(localesDir, `${lang.code}.json`);

      it("locale file exists and is valid JSON", () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const targetKeys = getLeafKeys(raw);
      const targetKeyList = Object.keys(targetKeys).sort();

      it("has identical keys to en.json (no missing, no extra)", () => {
        const missing = enKeyList.filter((k) => !targetKeyList.includes(k));
        const extra = targetKeyList.filter((k) => !enKeyList.includes(k));

        expect(missing, `Missing keys in ${lang.code}.json`).toEqual([]);
        expect(extra, `Extra keys in ${lang.code}.json`).toEqual([]);
      });

      it("has non-empty string values for all keys", () => {
        for (const [key, value] of Object.entries(targetKeys)) {
          expect(
            value.trim().length,
            `Empty translation for ${key} in ${lang.code}`,
          ).toBeGreaterThan(0);
        }
      });

      it("matches interpolation variables with en.json", () => {
        for (const key of enKeyList) {
          const enVars = extractPlaceholders(enKeys[key] || "");
          const targetVars = extractPlaceholders(targetKeys[key] || "");
          expect(
            targetVars,
            `Mismatched interpolation variables for ${key} in ${lang.code}`,
          ).toEqual(enVars);
        }
      });
    });
  }
});
