import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    mockReset: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // all + include: report every src file, not just ones a test loaded
      all: true,
      include: ["src/**/*.ts"],
      // main.ts is thin wiring, covered by the integration CI job instead
      exclude: ["src/main.ts"],
      // Remove to stop enforcing coverage (also revert ci.yml's pnpm coverage -> pnpm test)
      // Set at the numbers the existing suite already reaches, so a regression fails CI
      thresholds: {
        lines: 87,
        branches: 88,
        functions: 100,
        statements: 88,
      },
    },
  },
});
