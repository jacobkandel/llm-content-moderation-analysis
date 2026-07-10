import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react 7.x auto-detects the React version by shelling out
    // through context.getFilename(), which ESLint 10 removed — that detection
    // path throws "contextOrFilename.getFilename is not a function" and crashes
    // the whole lint run. Pinning the version here skips detection entirely.
    settings: {
      react: { version: "19.2" },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Abandoned duplicate app — not part of the build (also gitignored).
    "web_broken/**",
    // Generated service-worker / PWA runtime (produced by next-pwa/workbox).
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
  ]),
]);

export default eslintConfig;
