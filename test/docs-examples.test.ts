import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createWaBusinessClient } from "../src/index.js";
import { assertTemplateBodyLength, renderSignatureParameter } from "../src/index.js";
import { fakeFetch, jsonResponse } from "./helpers/fake-fetch.js";
import { TEST_TOKEN, TEST_WABA_ID } from "./helpers/ids.js";
import { CREATE_RESPONSE, INVOICE_BODY_TEXT } from "./fixtures/templates.js";

// B-1 (v0.2 spec §9): no documented template body may start or end with a
// parameter (F-049, error 2388299). Documentation shows bodies on lines that
// begin with "Template body:" followed by the body in backticks.
const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(`${root}${path}`, "utf8");

const DOCS = [
  ["README.md", "README.md"],
  ["v0.1 spec §7", "docs/specs/wa-cloud-kit.md"],
  ["renderSignatureParameter JSDoc", "src/signature/render.ts"],
] as const;

function documentedBodies(text: string): string[] {
  return [...text.matchAll(/Template body: `([^`\n]+)`/g)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
}

export function startsOrEndsWithPlaceholder(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.startsWith("{{") || trimmed.endsWith("}}");
}

describe("documentation examples never start or end with a parameter (B-1)", () => {
  it.each(DOCS)(
    "%s documents at least one template body, all ending in static text",
    (_label, path) => {
      const bodies = documentedBodies(read(path));
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        expect(startsOrEndsWithPlaceholder(body), body).toBe(false);
      }
    },
  );

  it("no doc or comment shows the old `… Regards, {{signature}}` form", () => {
    for (const [, path] of DOCS) {
      expect(read(path)).not.toMatch(/Regards, \{\{signature\}\}/);
    }
  });

  it("the checker flags the dangling forms it exists to catch", () => {
    expect(startsOrEndsWithPlaceholder("Hello. Regards, {{signature}}")).toBe(true);
    expect(startsOrEndsWithPlaceholder("{{name}} says hi")).toBe(true);
    expect(startsOrEndsWithPlaceholder("  Due {{1}}  \n")).toBe(true);
    expect(startsOrEndsWithPlaceholder("Contact {{signature}}. Thank you.")).toBe(false);
  });

  it("the §2.1 invoice body used by createTemplate passes the same check", async () => {
    expect(startsOrEndsWithPlaceholder(INVOICE_BODY_TEXT)).toBe(false);
    // ...and createTemplate itself accepts it (docs example and validator agree).
    const fake = fakeFetch([jsonResponse(CREATE_RESPONSE)]);
    const client = createWaBusinessClient({
      wabaId: TEST_WABA_ID,
      accessToken: TEST_TOKEN,
      graphApiVersion: "v25.0",
      fetch: fake.fetch,
    });
    await client.createTemplate({
      name: "invoice_with_pdf",
      language: "en_US",
      category: "UTILITY",
      body: {
        text: INVOICE_BODY_TEXT,
        format: "named",
        examples: ["customer_name", "invoice_number", "amount", "due_date", "signature"].map(
          (name) => ({ name, example: "x" }),
        ),
      },
    });
    expect(fake.calls).toHaveLength(1);
  });

  it("every documented body is accepted by createTemplate's placeholder rules", async () => {
    for (const [, path] of DOCS) {
      for (const body of documentedBodies(read(path))) {
        const names = [...body.matchAll(/\{\{([a-z_]+)\}\}/g)].flatMap((m) => (m[1] ? [m[1]] : []));
        const fake = fakeFetch([jsonResponse(CREATE_RESPONSE)]);
        const client = createWaBusinessClient({
          wabaId: TEST_WABA_ID,
          accessToken: TEST_TOKEN,
          graphApiVersion: "v25.0",
          fetch: fake.fetch,
        });
        await client.createTemplate({
          name: "doc_example",
          language: "en_US",
          category: "UTILITY",
          body: {
            text: body,
            format: "named",
            examples: names.map((name) => ({ name, example: "x" })),
          },
        });
        expect(fake.calls).toHaveLength(1);
      }
    }
  });

  it("the rendered signature fits the documented body (length check only, F-044)", () => {
    const signature = renderSignatureParameter({
      signature: { name: "Accounts Team", company: "Example Traders" },
      parameterName: "signature",
    });
    expect(() => {
      assertTemplateBodyLength("Contact {{signature}}. Thank you.", [signature]);
    }).not.toThrow();
  });
});
