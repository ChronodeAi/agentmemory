import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { isAcceptedNode, sha256 } from "./lib.mjs";

const defaultRoot = resolve(import.meta.dirname, "../..");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function receiptFiles(root, path) {
  const absolute = resolve(root, path);
  if (statSync(absolute).isFile()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(absolute, entry.name);
    if (entry.isDirectory()) return receiptFiles(root, child);
    return entry.isFile() && entry.name === "receipt.json" ? [child] : [];
  });
}

function resolveRule(schema, rule) {
  if (!rule.$ref) return rule;
  const path = rule.$ref.replace(/^#\//, "").split("/");
  let resolved = schema;
  for (const segment of path) resolved = resolved[segment];
  if (!resolved) throw new Error(`unresolved schema reference ${rule.$ref}`);
  return resolved;
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}

export function validateValue(value, rawRule, schema, path = "$") {
  const rule = resolveRule(schema, rawRule);
  const errors = [];
  const acceptedTypes = Array.isArray(rule.type)
    ? rule.type
    : rule.type
      ? [rule.type]
      : [];
  if (
    acceptedTypes.length > 0 &&
    !acceptedTypes.some((type) => matchesType(value, type))
  ) {
    return [`${path} must be ${acceptedTypes.join(" or ")}`];
  }
  if (rule.type === "object") {
    for (const key of rule.required ?? []) {
      if (!(key in value)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, child] of Object.entries(rule.properties ?? {})) {
      if (key in value) {
        errors.push(...validateValue(value[key], child, schema, `${path}.${key}`));
      }
    }
    for (const [key, childValue] of Object.entries(value)) {
      if (key in (rule.properties ?? {})) continue;
      if (rule.additionalProperties === false) {
        errors.push(`${path}.${key} is not allowed`);
      } else if (
        rule.additionalProperties &&
        typeof rule.additionalProperties === "object"
      ) {
        errors.push(
          ...validateValue(
            childValue,
            rule.additionalProperties,
            schema,
            `${path}.${key}`,
          ),
        );
      }
    }
  }
  if (rule.type === "array") {
    for (let index = 0; index < value.length; index++) {
      if (rule.items) {
        errors.push(
          ...validateValue(value[index], rule.items, schema, `${path}[${index}]`),
        );
      }
    }
    if (rule.uniqueItems) {
      const unique = new Set(value.map((item) => JSON.stringify(item)));
      if (unique.size !== value.length) errors.push(`${path} must be unique`);
    }
  }
  if (typeof value === "string") {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${path} must have at least ${rule.minLength} character(s)`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${path} must have at most ${rule.maxLength} character(s)`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      errors.push(`${path} does not match ${rule.pattern}`);
    }
    if (rule.format === "date-time" && !Number.isFinite(Date.parse(value))) {
      errors.push(`${path} must be an ISO date-time`);
    }
  }
  if (typeof value === "number") {
    if (rule.minimum !== undefined && value < rule.minimum) {
      errors.push(`${path} must be >= ${rule.minimum}`);
    }
    if (rule.maximum !== undefined && value > rule.maximum) {
      errors.push(`${path} must be <= ${rule.maximum}`);
    }
  }
  if ("const" in rule && value !== rule.const) {
    errors.push(`${path} must equal ${JSON.stringify(rule.const)}`);
  }
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${path} must be one of ${rule.enum.join(", ")}`);
  }
  return errors;
}

function trackedTests(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        files.push(relative(root, path).replaceAll("\\", "/"));
      }
    }
  };
  visit(join(root, "test"));
  return files.sort();
}

function testContentSha(root, tests) {
  const hash = createHash("sha256");
  for (const path of tests) {
    hash.update(`PATH\0${path}\0`);
    hash.update(readFileSync(join(root, path)));
  }
  return hash.digest("hex");
}

function git(root, args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${
        result.error?.message ??
        (typeof result.stderr === "string"
          ? result.stderr.trim()
          : result.stderr?.toString().trim())
      }`,
    );
  }
  return result.stdout;
}

export function sourceState(root) {
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const diff = git(root, ["diff", "--binary", "HEAD", "--", "."], null);
  const untracked = git(
    root,
    ["ls-files", "--others", "--exclude-standard", "-z"],
  )
    .split("\0")
    .filter(Boolean)
    .filter(
      (path) =>
        path !== ".aiwg/sessions.json" &&
        path !== "node_modules" &&
        !path.startsWith(".r13-receipts/"),
    )
    .sort();
  const hash = createHash("sha256");
  hash.update(`HEAD\0${head}\0`);
  hash.update(diff);
  for (const path of untracked) {
    hash.update(`\0PATH\0${path}\0`);
    hash.update(readFileSync(join(root, path)));
  }
  return {
    head,
    dirty: diff.length > 0 || untracked.length > 0,
    treeSha256: hash.digest("hex"),
  };
}

function artifactErrors(receipt, file, requirePass) {
  const errors = [];
  const receiptDirectory = dirname(file);
  for (const [name, expected] of Object.entries(receipt.artifact_sha256)) {
    const artifact = join(receiptDirectory, name);
    if (!existsSync(artifact)) {
      errors.push(`artifact missing: ${name}`);
      continue;
    }
    const actual = sha256(readFileSync(artifact));
    if (actual !== expected) errors.push(`artifact hash mismatch: ${name}`);
  }
  const requiredArtifacts = [
    "stderr.log",
    "stdout.log",
    "telemetry.jsonl",
    "tracked-tests.txt",
    "vitest.json",
    "worker-pids.txt",
  ];
  if (
    requirePass ||
    receipt.result === "pass" ||
    receipt.result === "provisional-pass"
  ) {
    for (const name of requiredArtifacts) {
      if (!(name in receipt.artifact_sha256)) {
        errors.push(`artifact hash missing: ${name}`);
      }
    }
  }
  const sidecar = join(receiptDirectory, "receipt.sha256");
  if (!existsSync(sidecar)) {
    errors.push("receipt.sha256 is missing");
  } else {
    const expected = `${sha256(readFileSync(file))}  receipt.json`;
    if (readFileSync(sidecar, "utf8").trim() !== expected) {
      errors.push("receipt.sha256 mismatch");
    }
  }
  return errors;
}

export function qualificationErrors(
  receipt,
  {
    root = defaultRoot,
    file,
    requirePass = false,
    observedSource,
    observedTests,
  } = {},
) {
  const errors = [];
  const qualifiedNode = isAcceptedNode(receipt.environment.node);
  if (receipt.environment.qualified_node_profile !== qualifiedNode) {
    errors.push("qualified_node_profile does not match environment.node");
  }

  const tests = observedTests ?? trackedTests(root);
  const manifestSha = sha256(`${tests.join("\n")}\n`);
  const contentSha = testContentSha(root, tests);
  const frozen = readJson(join(root, "ci/r13-test-manifest.json"));
  if (
    receipt.tests.expected_count !== tests.length ||
    receipt.tests.expected_manifest_sha256 !== manifestSha ||
    receipt.tests.expected_content_sha256 !== contentSha
  ) {
    errors.push("receipt test manifest/content does not match source");
  }
  if (
    frozen.count !== tests.length ||
    frozen.sha256 !== manifestSha ||
    frozen.content_sha256 !== contentSha
  ) {
    errors.push("frozen test manifest/content drift");
  }

  const source = observedSource ?? sourceState(root);
  if (
    receipt.source_sha !== source.head ||
    receipt.source_tree_sha256 !== source.treeSha256 ||
    receipt.source_worktree_dirty !== source.dirty
  ) {
    errors.push("receipt source linkage does not match checkout");
  }

  if (file) errors.push(...artifactErrors(receipt, file, requirePass));

  if (requirePass && receipt.result !== "pass") {
    errors.push("receipt is not a passing qualification receipt");
  }
  if (
    receipt.result === "pass" ||
    receipt.result === "provisional-pass"
  ) {
    const processFields = [
      "argv",
      "started_at",
      "ended_at",
      "duration_ms",
      "exit_code",
      "signal",
      "peak_rss_bytes",
      "service_pid",
      "worker_pids",
      "peak_concurrent_workers",
      "iii_sha256",
      "iii_sha_verified",
    ];
    const testFields = [
      "observed_count",
      "missing",
      "extra",
      "skipped",
      "mandatory_auth_tests",
      "missing_auth_tests",
    ];
    for (const field of processFields) {
      if (!(field in receipt.process)) errors.push(`process.${field} is required`);
    }
    for (const field of testFields) {
      if (!(field in receipt.tests)) errors.push(`tests.${field} is required`);
    }
    if (!receipt.environment.mandatory_auth_configured) {
      errors.push("mandatory authentication was not configured");
    }
    if (
      !receipt.environment
        .mandatory_project_capability_auth_configured
    ) {
      errors.push(
        "mandatory project capability authentication was not configured",
      );
    }
    if (receipt.process.exit_code !== 0 || receipt.process.signal !== null) {
      errors.push("test process did not exit cleanly");
    }
    if (receipt.process.duration_ms > receipt.limits.timeout_ms) {
      errors.push("wall-clock timeout exceeded");
    }
    if (receipt.process.peak_rss_bytes > receipt.limits.rss_bytes) {
      errors.push("RSS ceiling exceeded");
    }
    if (
      receipt.limits.max_workers !== 1 ||
      receipt.process.peak_concurrent_workers > 1
    ) {
      errors.push("single-worker ceiling exceeded");
    }
    if (receipt.tests.observed_count !== receipt.tests.expected_count) {
      errors.push("observed test count does not match expected count");
    }
    for (const field of ["missing", "extra", "skipped", "missing_auth_tests"]) {
      if (receipt.tests[field]?.length > 0) {
        errors.push(`tests.${field} must be empty`);
      }
    }
    if (
      receipt.tests.mandatory_auth_tests?.length === 0 ||
      receipt.failures.length > 0
    ) {
      errors.push("passing receipt lacks mandatory auth evidence or has failures");
    }

    const expectedWaivers = [
      ...(!qualifiedNode ? ["unqualified-node-profile"] : []),
      ...(receipt.source_worktree_dirty ? ["dirty-source"] : []),
      ...(receipt.process.iii_sha_verified !== true
        ? ["unverified-iii-provenance"]
        : []),
    ].sort();
    const actualWaivers = [...(receipt.qualification_waivers ?? [])].sort();
    if (receipt.result === "pass") {
      if (receipt.source_worktree_dirty) errors.push("passing source is dirty");
      if (!qualifiedNode) errors.push("passing Node profile is unqualified");
      if (receipt.process.iii_sha_verified !== true) {
        errors.push("iii-engine provenance is unqualified");
      }
      if (actualWaivers.length > 0) {
        errors.push("passing qualification receipt cannot contain waivers");
      }
    } else if (
      expectedWaivers.length === 0 ||
      JSON.stringify(actualWaivers) !== JSON.stringify(expectedWaivers)
    ) {
      errors.push("provisional receipt waivers do not match the environment");
    }
  }
  return errors;
}

export function validateReceipt(
  receipt,
  {
    root = defaultRoot,
    schema = readJson(join(root, "schemas/r13-receipt.schema.json")),
    ...options
  } = {},
) {
  return [
    ...validateValue(receipt, schema, schema),
    ...qualificationErrors(receipt, { root, ...options }),
  ];
}

export function validateReceiptFile(
  file,
  { root = defaultRoot, requirePass = false } = {},
) {
  const receipt = readJson(file);
  const errors = validateReceipt(receipt, { root, file, requirePass });
  if (errors.length > 0) {
    throw new Error(`${file} failed validation: ${errors.join("; ")}`);
  }
  return receipt;
}

async function main() {
  const requirePass = process.argv.includes("--require-pass");
  const targets = process.argv.slice(2).filter((arg) => arg !== "--require-pass");
  if (targets.length === 0) {
    throw new Error("provide at least one receipt file or directory");
  }
  const files = targets.flatMap((target) => receiptFiles(defaultRoot, target));
  if (files.length === 0) throw new Error("no receipt.json files found");
  for (const file of files) validateReceiptFile(file, { requirePass });
  console.log(`Validated ${files.length} R-13 receipt(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
