module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { project: ["./tsconfig.json"] },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: ["dist/**", "node_modules/**", "**/__tests__/**", "**/*.test.ts"],
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
  overrides: [
    {
      // Integration layers still consume loosely shaped webhook / Firestore / task payloads.
      files: [
        "src/admin/manualSettlement.ts",
        "src/api/documents.ts",
        "src/api/documentsV1.ts",
        "src/api/expenses.ts",
        "src/automations/**/*.ts",
        "src/core/businessSettings.ts",
        "src/core/commandParser.ts",
        "src/core/conversationHandler.ts",
        "src/core/conversationOrchestrator.ts",
        "src/core/evidenceFixtures.ts",
        "src/core/paymentConfirmation.ts",
        "src/core/systemPrompt.ts",
        "src/core/ux/**/*.ts",
        "src/lineWebhookV1.ts",
        "src/middleware/serviceAuth.ts",
        "src/pdfRedirect.ts",
        "src/services/**/*.ts",
        "src/tasks/**/*.ts",
        "src/utils/**/*.ts",
        "src/workers/**/*.ts",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
