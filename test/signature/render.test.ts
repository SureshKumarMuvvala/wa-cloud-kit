import { describe, expect, it } from "vitest";
import {
  WaValidationError,
  assertTemplateBodyLength,
  renderSignatureParameter,
} from "../../src/index.js";

describe("renderSignatureParameter (tests 37-41)", () => {
  it("renders only the name as a positional text parameter", () => {
    expect(renderSignatureParameter({ signature: { name: "Accounts Team" } })).toStrictEqual({
      type: "text",
      text: "Accounts Team",
    });
  });

  it('joins all parts in order with " | "', () => {
    expect(
      renderSignatureParameter({
        signature: {
          name: "Accounts Team",
          title: "Billing",
          company: "Example Traders",
          lines: ["billing@example.com", "Mon-Fri 9-5"],
        },
      }).text,
    ).toBe("Accounts Team | Billing | Example Traders | billing@example.com | Mon-Fri 9-5");
  });

  it("supports a custom separator", () => {
    expect(
      renderSignatureParameter({
        signature: { name: "Accounts Team", company: "Example Traders" },
        separator: " - ",
      }).text,
    ).toBe("Accounts Team - Example Traders");
  });

  it("collapses newlines, tabs and runs of whitespace inside parts", () => {
    const { text } = renderSignatureParameter({
      signature: {
        name: "  Accounts\n\nTeam ",
        title: "Billing\tand\r\nCollections",
        lines: ["a   b"],
      },
    });
    expect(text).toBe("Accounts Team | Billing and Collections | a b");
    expect(text).not.toMatch(/[\n\t]/);
  });

  it.each(["\n", " |\n", "\t", "|\t|"])("rejects the separator %j", (separator) => {
    expect(() => renderSignatureParameter({ signature: { name: "A" }, separator })).toThrow(
      WaValidationError,
    );
  });

  it("drops empty and whitespace-only parts", () => {
    expect(
      renderSignatureParameter({
        signature: { name: "Accounts Team", title: "   ", company: "", lines: ["", "\n\t", "x"] },
      }).text,
    ).toBe("Accounts Team | x");
  });

  it("drops an empty name but keeps the other parts", () => {
    expect(
      renderSignatureParameter({ signature: { name: " ", company: "Example Traders" } }).text,
    ).toBe("Example Traders");
  });

  it("rejects an all-empty signature (F-049)", () => {
    expect(() =>
      renderSignatureParameter({ signature: { name: " \n ", title: "", lines: ["\t"] } }),
    ).toThrow(WaValidationError);
  });

  it("produces a named parameter when parameterName is set", () => {
    expect(
      renderSignatureParameter({
        signature: { name: "Accounts Team" },
        parameterName: "signature",
      }),
    ).toStrictEqual({ type: "text", parameter_name: "signature", text: "Accounts Team" });
  });

  it.each(["Signature", "sig1", "sig-name", ""])(
    "rejects the parameterName %j",
    (parameterName) => {
      expect(() => renderSignatureParameter({ signature: { name: "A" }, parameterName })).toThrow(
        WaValidationError,
      );
    },
  );

  it("does not strip #, $ or % (F-049 applies to template review)", () => {
    expect(renderSignatureParameter({ signature: { name: "Team #1 $ 100%" } }).text).toBe(
      "Team #1 $ 100%",
    );
  });

  it("rejects unknown keys", () => {
    expect(() =>
      renderSignatureParameter({ signature: { name: "A", phone: "x" } } as never),
    ).toThrow(WaValidationError);
  });
});

describe("assertTemplateBodyLength (test 42)", () => {
  // "Hello {{customer_name}}, invoice {{invoice_no}}. Regards, {{signature}}"
  const namedBody = "Hello {{customer_name}}, invoice {{invoice_no}}. Regards, {{signature}}";
  const positionalBody = "Hello {{1}}, invoice {{2}}. Regards, {{3}}";
  const fixedNamed = "Hello , invoice . Regards, ".length;
  const fixedPositional = fixedNamed;

  function named(signatureLength: number) {
    return [
      { type: "text", parameter_name: "customer_name", text: "Asha" },
      { type: "text", parameter_name: "invoice_no", text: "INV-001" },
      { type: "text", parameter_name: "signature", text: "s".repeat(signatureLength) },
    ] as const;
  }

  function positional(signatureLength: number) {
    return [
      { type: "text", text: "Asha" },
      { type: "text", text: "INV-001" },
      { type: "text", text: "s".repeat(signatureLength) },
    ] as const;
  }

  const fill = 1024 - fixedNamed - "Asha".length - "INV-001".length;

  it("passes at exactly 1024 and throws at 1025 (named)", () => {
    expect(() => {
      assertTemplateBodyLength(namedBody, named(fill));
    }).not.toThrow();
    expect(() => {
      assertTemplateBodyLength(namedBody, named(fill + 1));
    }).toThrow(WaValidationError);
  });

  it("passes at exactly 1024 and throws at 1025 (positional)", () => {
    const positionalFill = 1024 - fixedPositional - "Asha".length - "INV-001".length;
    expect(() => {
      assertTemplateBodyLength(positionalBody, positional(positionalFill));
    }).not.toThrow();
    expect(() => {
      assertTemplateBodyLength(positionalBody, positional(positionalFill + 1));
    }).toThrow(WaValidationError);
  });

  it("substitutes every occurrence of a placeholder", () => {
    const body = "{{name}} {{name}}";
    const value = "n".repeat(512);
    expect(() => {
      assertTemplateBodyLength(body, [{ type: "text", parameter_name: "name", text: value }]);
    }).toThrow(WaValidationError); // 512 + 1 + 512 = 1025
    expect(() => {
      assertTemplateBodyLength(body, [
        { type: "text", parameter_name: "name", text: value.slice(1) },
      ]);
    }).not.toThrow(); // 511 + 1 + 511 = 1023
  });

  it("works with a rendered signature parameter", () => {
    const signature = renderSignatureParameter({
      signature: { name: "Accounts Team", company: "Example Traders" },
      parameterName: "signature",
    });
    expect(() => {
      assertTemplateBodyLength("Regards, {{signature}}", [signature]);
    }).not.toThrow();
  });
});
