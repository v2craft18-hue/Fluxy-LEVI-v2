import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Supabase returns untyped responses - using `any` is pragmatic here
      "@typescript-eslint/no-explicit-any": "warn",
      // JSX inline comments are common in React dev
      "react/jsx-no-comment-textnodes": "warn",
      // useMemo deps are handled case-by-case
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
