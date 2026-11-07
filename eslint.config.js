import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import globals from "globals";

const config = [
  { ignores: ["**/node_modules", ".next/**", "out/**", "next-env.d.ts", "**/.llm-cache"] },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Apostrophes and quotes in JSX copy are fine; escaping them hurts readability.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
