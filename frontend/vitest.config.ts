import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  include: ["tests/**/*.test.ts"],
  coverage: {
    include: ["src/lib/theme.ts", "src/lib/workspace.ts"],
    reporter: ["text", "text-summary", "json-summary"],
    thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
} });
