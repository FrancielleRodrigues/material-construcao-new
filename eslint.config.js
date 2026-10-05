import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      // Lista curta de globais do navegador: os globais completos (globals.browser) incluem
      // History, Navigation, Lock etc., que escondem import esquecido de ícone do lucide-react.
      globals: {
        ...globals.es2021,
        window: "readonly", document: "readonly", console: "readonly", fetch: "readonly",
        alert: "readonly", confirm: "readonly", navigator: "readonly",
        setTimeout: "readonly", clearTimeout: "readonly", URL: "readonly", Blob: "readonly",
      },
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
      "react/jsx-no-undef": "error",
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  { files: ["*.config.js"], languageOptions: { globals: globals.node } },
];
