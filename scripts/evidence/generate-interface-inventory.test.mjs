import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

test("generates the complete governed interface denominator", () => {
  const temp = mkdtempSync(join(tmpdir(), "agentmemory-icm-"));
  try {
    const output = join(temp, "inventory.json");
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/evidence/generate-interface-inventory.mjs",
        `--output=${output}`,
      ],
      { cwd: root, stdio: "pipe" },
    );
    const inventory = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(inventory.counts.http_routes, 135);
    assert.equal(inventory.counts.missing_auth_routes, 0);
    assert.equal(inventory.counts.mcp_transport_routes, 6);
    assert.equal(inventory.counts.mcp_tools, 59);
    assert.equal(inventory.counts.mcp_resources, 6);
    assert.equal(inventory.counts.mcp_prompts, 3);
    assert.equal(inventory.counts.mcp_standalone_fallback_tools, 7);
    assert.equal(inventory.counts.hooks, 13);
    assert.equal(inventory.counts.host_connectors, 18);
    assert.ok(inventory.counts.viewer_ui_rest_expressions > 0);
    assert.equal(
      new Set(inventory.surfaces.map((surface) => surface.surface_id)).size,
      inventory.surfaces.length,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
