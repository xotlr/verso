import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypeScriptConfig from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "verso-engine/**",
      "scripts/**",
      "private/**",
      "*.config.{js,ts,mjs}"
    ]
  },
  ...nextConfig,
  ...nextTypeScriptConfig,
  {
    rules: {
      // TypeScript rules - enforce strict typing
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",

      // React rules
      "react/no-unescaped-entities": "error",
      "react-hooks/exhaustive-deps": "error",

      // Next.js rules
      "@next/next/no-img-element": "warn", // Keep as warn - sometimes necessary
    },
  },
  {
    // Ignore test files for some strict rules
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  }
];

export default eslintConfig;
