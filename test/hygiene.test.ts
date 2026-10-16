import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Test 43: no token-like strings and no real-looking phone numbers in
// src/, test/ or docs/. sources/ is exempt (verbatim Meta samples).
const root = fileURLToPath(new URL("..", import.meta.url));
const SCANNED_DIRS = ["src", "test", "docs"];

// Built from parts so this file does not match its own patterns.
const TOKEN_PATTERN = new RegExp(["E", "AA", "[A-Za-z0-9]{10,}"].join(""), "g");
// E.164-looking: "+" then 8–15 digits. The fictional +1555… range is allowed.
const E164_PATTERN = /\+[1-9]\d{7,14}/g;
const FICTIONAL_PREFIX = "+1555";

function listFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...listFiles(path));
    } else {
      out.push(path);
    }
  }
  return out;
}

const files = SCANNED_DIRS.flatMap((dir) => listFiles(join(root, dir)));

export function findViolations(text: string): string[] {
  const tokens = text.match(TOKEN_PATTERN) ?? [];
  const phones = (text.match(E164_PATTERN) ?? []).filter((n) => !n.startsWith(FICTIONAL_PREFIX));
  return [...tokens, ...phones];
}

describe("repo hygiene", () => {
  it("scans a non-trivial number of files", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it("finds no token-like strings or non-fictional phone numbers", () => {
    const violations = files.flatMap((file) =>
      findViolations(readFileSync(file, "utf8")).map((hit) => `${relative(root, file)}: ${hit}`),
    );
    expect(violations).toEqual([]);
  });

  it("the scanner itself flags a token-like string and a real-looking number", () => {
    const fakeToken = ["E", "AA", "Bcdefghijklmn"].join("");
    expect(findViolations(`token ${fakeToken}`)).toHaveLength(1);
    expect(findViolations("call +4420" + "79460000")).toHaveLength(1);
    expect(findViolations("call +15550000001")).toEqual([]);
  });
});
