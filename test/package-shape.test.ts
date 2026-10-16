import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Test 44: package shape.
const PackageJsonSchema = z.looseObject({
  type: z.string(),
  exports: z.unknown(),
  dependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  packageManager: z.string().optional(),
  engines: z.record(z.string(), z.string()).optional(),
  main: z.unknown().optional(),
  require: z.unknown().optional(),
});

const pkg = PackageJsonSchema.parse(
  JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")),
);

function collectKeys(value: unknown, out: string[] = []): string[] {
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      out.push(key);
      collectKeys(child, out);
    }
  }
  return out;
}

describe("package.json", () => {
  it('is ESM ("type": "module") with no main/require', () => {
    expect(pkg.type).toBe("module");
    expect(pkg.main).toBeUndefined();
    expect(pkg.require).toBeUndefined();
  });

  it("has an exports map without a default or require condition", () => {
    const keys = collectKeys(pkg.exports);
    expect(keys).toContain("types");
    expect(keys).toContain("import");
    expect(keys).not.toContain("default");
    expect(keys).not.toContain("require");
  });

  it("has no runtime dependencies", () => {
    expect(Object.keys(pkg.dependencies ?? {})).toEqual([]);
  });

  it("declares zod ^4.0.0 as a peer", () => {
    expect(pkg.peerDependencies).toEqual({ zod: "^4.0.0" });
  });

  it("pins the toolchain", () => {
    expect(pkg.packageManager).toBe("pnpm@11.25.0");
    expect(pkg.engines).toEqual({ node: ">=22" });
    expect(readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim()).toBe("22.22.2");
  });
});
