import { defineConfig } from "vitest/config";

const jsonOutput =
  process.env.R13_VITEST_JSON ??
  ".aiwg/working/evidence/r13/vitest.json";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    pool: "forks",
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    isolate: true,
    retry: 0,
    allowOnly: false,
    passWithNoTests: false,
    setupFiles: ["test/r13.setup.ts"],
    sequence: {
      concurrent: false,
      shuffle: false,
      hooks: "list",
      setupFiles: "list",
    },
    reporters: ["default", "json"],
    outputFile: {
      json: jsonOutput,
    },
    includeTaskLocation: true,
  },
});
