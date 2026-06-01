import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    plugins: {
      boundaries
    },
    settings: {
      "boundaries/include": ["src/**/*.ts", "tests/**/*.ts"],
      "boundaries/elements": [
        { type: "cli", pattern: "src/cli/*.ts", mode: "full" },
        { type: "adapter", pattern: "src/adapters/**/*.ts", mode: "full" },
        { type: "schema", pattern: "src/core/schemas/*.ts", mode: "full" },
        { type: "quality", pattern: "src/core/quality/*.ts", mode: "full" },
        { type: "review", pattern: "src/core/review/*.ts", mode: "full" },
        { type: "test", pattern: "tests/*.ts", mode: "full" }
      ]
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/explicit-function-return-type": "off",
      "boundaries/dependencies": ["error", {
        default: "allow",
        rules: [
          { from: { type: "cli" }, disallow: [{ to: { type: "test" } }] },
          { from: { type: "adapter" }, disallow: [{ to: { type: ["cli", "quality", "review", "test"] } }] },
          { from: { type: "schema" }, disallow: [{ to: { type: ["cli", "adapter", "quality", "review", "test"] } }] },
          { from: { type: "quality" }, disallow: [{ to: { type: ["cli", "adapter", "review", "test"] } }] },
          { from: { type: "review" }, disallow: [{ to: { type: ["cli", "adapter", "quality", "test"] } }] },
          { from: { type: "test" }, allow: [{ to: { type: ["cli", "adapter", "schema", "quality", "review", "test"] } }] }
        ]
      }]
    }
  }
);
