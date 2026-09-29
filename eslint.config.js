import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import svelteConfig from "./svelte.config.js";

export default defineConfig(
  { ignores: ["dist/", ".astro/", "public/vendor/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  svelte.configs.recommended,
  astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: { globals: { ...globals.serviceworker, $scramjetController: "readonly" } },
  },
);
