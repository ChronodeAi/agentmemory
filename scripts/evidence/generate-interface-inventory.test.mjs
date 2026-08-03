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
    assert.equal(inventory.counts.http_routes, 136);
    assert.equal(inventory.counts.missing_auth_routes, 0);
    assert.equal(inventory.counts.mcp_transport_routes, 6);
    assert.equal(inventory.counts.mcp_tools, 59);
    assert.equal(inventory.counts.mcp_resources, 5);
    assert.equal(inventory.counts.mcp_prompts, 3);
    assert.equal(inventory.counts.mcp_standalone_fallback_tools, 7);
    assert.equal(inventory.counts.hooks, 13);
    assert.equal(inventory.counts.host_connectors, 18);
    assert.ok(inventory.counts.provider_attempt_sites > 0);
    assert.ok(inventory.counts.viewer_ui_rest_expressions > 0);
    assert.match(inventory.source_identity.commit_sha, /^[a-f0-9]{40}$/);
    assert.match(inventory.source_identity.commit_tree_sha, /^[a-f0-9]{40}$/);
    assert.match(
      inventory.source_identity.inventory_input_sha256,
      /^[a-f0-9]{64}$/,
    );
    assert.equal(
      new Set(inventory.surfaces.map((surface) => surface.surface_id)).size,
      inventory.surfaces.length,
    );
    for (const surface of inventory.surfaces) {
      assert.ok(surface.control_ids.length > 0, surface.surface_id);
      assert.ok(surface.requirements.length > 0, surface.surface_id);
      assert.ok(surface.risks.length > 0, surface.surface_id);
      assert.ok(surface.tests.length > 0, surface.surface_id);
    }
    const purposes = new Set(
      inventory.provider_attempt_sites.map((attempt) => attempt.purpose),
    );
    for (const purpose of [
      "query",
      "embedding",
      "vision",
      "migration",
      "fallback",
    ]) {
      assert.ok(purposes.has(purpose), `missing ${purpose} provider attempt`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
