import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Pin the React version so eslint-plugin-react does not try to auto-detect it.
  // Auto-detection crashes under ESLint 10 (contextOrFilename.getFilename is not
  // a function), taking the whole lint run down with it.
  {
    settings: {
      react: {
        version: "19.2",
      },
    },
  },
  // Standalone Node build/utility scripts are CommonJS, so require() and the
  // occasional ts-directive are legitimate there, not app-code smells.
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // Allow deliberately-unused bindings when prefixed with an underscore
  // (e.g. positional callback args, caught errors we intentionally ignore).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated / abandoned files that should not be linted.
    "web_broken/**",
    "public/workbox-*.js",
    "public/sw.js",
  ]),
]);

export default eslintConfig;
