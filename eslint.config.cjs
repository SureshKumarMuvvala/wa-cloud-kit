// ESLint flat config. Written as CommonJS so the repo has no `export default`
// anywhere (CLAUDE.md: named exports only); ESLint reads `module.exports`.
"use strict";

const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: [
      "dist/",
      "examples-dist/",
      "node_modules/",
      "coverage/",
      "sources/",
      "eslint.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Named exports only (CLAUDE.md).",
        },
        {
          selector: "ExportSpecifier[exported.name='default']",
          message: "Named exports only (CLAUDE.md).",
        },
      ],
    },
  },
  prettier,
);
