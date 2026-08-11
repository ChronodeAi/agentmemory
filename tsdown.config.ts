import { defineConfig } from "tsdown";

const hookEntries = [
  "src/hooks/session-start.ts",
  "src/hooks/prompt-submit.ts",
  "src/hooks/pre-tool-use.ts",
  "src/hooks/post-tool-use.ts",
  "src/hooks/post-tool-failure.ts",
  "src/hooks/pre-compact.ts",
  "src/hooks/subagent-start.ts",
  "src/hooks/subagent-stop.ts",
  "src/hooks/notification.ts",
  "src/hooks/task-completed.ts",
  "src/hooks/stop.ts",
  "src/hooks/session-end.ts",
  "src/hooks/post-commit.ts",
];

const shared = {
  format: ["esm"] as const,
  target: "node20" as const,
  // Keep these as node_modules imports (deps.neverBundle). We never import
  // onnxruntime-{node,web} directly; they come in transitively through
  // @xenova/transformers, which is lazy-loaded from
  // src/providers/embedding/{clip,local}.ts and src/state/reranker.ts.
  // Bundling inlines relative paths like
  // `../bin/napi-v3/darwin/arm64/onnxruntime_binding.node` that no longer
  // resolve from dist/. All are declared as optionalDependencies in
  // package.json so users can install them only when they enable local
  // embeddings / CLIP / reranker.
  deps: {
    neverBundle: [
      "@xenova/transformers",
      "onnxruntime-node",
      "onnxruntime-web",
      "@anthropic-ai/claude-agent-sdk",
      "@anthropic-ai/sdk",
    ],
  },
  // Each entry is its own build, so the per-entry dts/deps timing notice
  // fires ~30 times and drowns the real output. It is informational only.
  inputOptions: {
    checks: { pluginTimings: false },
  },
};

// Provider plugin caches contain only the published plugin tree. Bundle the
// small config parsers used by hooks so those entrypoints never depend on a
// repository or package-level node_modules directory at runtime.
const pluginShared = {
  ...shared,
  deps: {
    ...shared.deps,
    alwaysBundle: ["dotenv", "yaml"],
  },
};

const pluginEntries = {
  standalone: "src/mcp/standalone.ts",
  diagnostics: "src/functions/diagnostics.ts",
  ...Object.fromEntries(
    hookEntries.map((entry) => [
      entry.replace(/^src\/hooks\//, "").replace(/\.ts$/, ""),
      entry,
    ]),
  ),
};

export default defineConfig([
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    ...shared,
    dts: true,
    clean: true,
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: ["src/cli.ts"],
    outDir: "dist",
    ...shared,
    clean: false,
    sourcemap: false,
  },
  {
    entry: ["src/mcp/standalone.ts"],
    outDir: "dist",
    ...shared,
    clean: false,
    sourcemap: false,
  },
  {
    entry: ["src/functions/migrate.ts"],
    outDir: "dist/functions",
    ...shared,
    clean: false,
    sourcemap: false,
    banner: { js: "#!/usr/bin/env node" },
  },
  // Keep distributable package hooks independent; the package has its own
  // dependencies available at runtime.
  ...hookEntries.map((entry) => ({
    entry: [entry],
    outDir: "dist/hooks",
    ...shared,
    clean: false,
    sourcemap: false,
  })),
  // Build the published plugin as one graph so bundled config parsers are
  // shared once across entrypoints. The entire scripts directory is copied by
  // provider plugin managers, and the isolated publish-tree test exercises
  // those relative shared-chunk imports.
  {
    entry: pluginEntries,
    outDir: "plugin/scripts",
    ...pluginShared,
    clean: true,
    sourcemap: false,
  },
]);
