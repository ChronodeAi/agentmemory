import {
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import { parse as parseYaml } from "yaml";

import { getAllTools } from "../../src/mcp/tools-registry.ts";

const root = resolve(import.meta.dirname, "../..");
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = resolve(
  root,
  outputArg?.slice("--output=".length) ??
    ".aiwg/reports/g-icm-01-interface-inventory.json",
);
const checkOnly = process.argv.includes("--check");
const publicRoutes = new Set([
  "GET /agentmemory/livez",
]);
const inventoryInputPaths = new Set([
  "scripts/evidence/generate-interface-inventory.mjs",
  "src/triggers/api.ts",
  "src/mcp/server.ts",
  "src/mcp/standalone.ts",
  "src/mcp/tools-registry.ts",
  "src/cli/connect/index.ts",
  "src/viewer/index.html",
  "tsdown.config.ts",
  "plugin/hooks/hooks.json",
  "plugin/hooks/hooks.codex.json",
  "plugin/hooks/hooks.copilot.json",
  "integrations/hermes/plugin.yaml",
  "integrations/openclaw/plugin.yaml",
]);

const CONTROL_LINKS = {
  identity: {
    control_ids: ["ICM-01", "ICM-02"],
    requirements: ["FR-01", "FR-02", "FR-03", "FR-04"],
    risks: ["R-01", "R-10"],
    tests: [
      "test/project-config.test.ts",
      "test/cross-project-isolation.test.ts",
    ],
  },
  auth: {
    control_ids: ["ICM-02", "ICM-09"],
    requirements: ["FR-03", "FR-04", "FR-15", "FR-16", "FR-19"],
    risks: ["R-01", "R-02", "R-14"],
    tests: [
      "test/auth-capability.test.ts",
      "test/cross-project-isolation.test.ts",
      "test/integration.test.ts",
    ],
  },
  capture: {
    control_ids: ["ICM-03", "ICM-14"],
    requirements: ["FR-05", "FR-07", "FR-17", "FR-18"],
    risks: ["R-02", "R-07", "R-11"],
    tests: [
      "test/capture-profile.test.ts",
      "test/hook-project.test.ts",
      "test/claude-code-with-hooks.test.ts",
    ],
  },
  session: {
    control_ids: ["ICM-04", "ICM-14"],
    requirements: ["FR-06", "FR-17", "FR-18"],
    risks: ["R-06", "R-07", "R-11"],
    tests: [
      "test/observe-implicit-session.test.ts",
      "test/codex-connect-hooks.test.ts",
      "test/integration.test.ts",
    ],
  },
  context: {
    control_ids: ["ICM-05", "ICM-06"],
    requirements: ["FR-09", "FR-11", "FR-19"],
    risks: ["R-03", "R-04", "R-17"],
    tests: [
      "test/coding-memory.test.ts",
      "test/context-delivery-routes.test.ts",
      "test/context-eligibility.test.ts",
    ],
  },
  provenance: {
    control_ids: ["ICM-07"],
    requirements: ["FR-10", "FR-12"],
    risks: ["R-06"],
    tests: ["test/coding-memory.test.ts", "test/integration.test.ts"],
  },
  promotion: {
    control_ids: ["ICM-08"],
    requirements: ["FR-13", "FR-14"],
    risks: ["R-03", "R-05"],
    tests: ["test/promotions.test.ts"],
  },
  provider: {
    control_ids: ["ICM-10"],
    requirements: ["FR-07", "FR-15"],
    risks: ["R-02", "R-15"],
    tests: [
      "test/privacy.test.ts",
      "test/embedding-provider.test.ts",
      "test/agent-sdk-provider.test.ts",
    ],
  },
  health: {
    control_ids: ["ICM-11", "ICM-12"],
    requirements: ["FR-12", "FR-20"],
    risks: ["R-07", "R-08", "R-09"],
    tests: [
      "test/health-thresholds.test.ts",
      "test/viewer-session-id.test.ts",
      "test/integration.test.ts",
    ],
  },
  viewer: {
    control_ids: ["ICM-12"],
    requirements: ["FR-03", "FR-20"],
    risks: ["R-08", "R-09"],
    tests: [
      "test/slots.test.ts",
      "test/viewer-security.test.ts",
      "test/viewer-session-id.test.ts",
    ],
  },
  migration: {
    control_ids: ["ICM-13"],
    requirements: ["FR-02", "FR-19"],
    risks: ["R-13", "R-16"],
    tests: ["test/snapshot.test.ts", "test/infer-memory-projects.test.ts"],
  },
  connector: {
    control_ids: ["ICM-14"],
    requirements: ["FR-17", "FR-18"],
    risks: ["R-07", "R-11"],
    tests: [
      "test/cli-connect.test.ts",
      "test/codex-connect-hooks.test.ts",
      "test/claude-code-with-hooks.test.ts",
    ],
  },
};

function sourceFile(path) {
  const source = readFileSync(path, "utf8");
  return {
    source,
    file: ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    ),
  };
}

function property(object, name) {
  if (!object || !ts.isObjectLiteralExpression(object)) return undefined;
  return object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
        (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  )?.initializer;
}

function stringValue(node) {
  if (
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  ) {
    return node.text;
  }
  return undefined;
}

function stringArray(node) {
  if (!node || !ts.isArrayLiteralExpression(node)) return [];
  return node.elements.map(stringValue).filter(Boolean);
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function apiInventory() {
  const path = join(root, "src/triggers/api.ts");
  const { file } = sourceFile(path);
  const functions = [];
  const routes = [];

  walk(file, (node) => {
    if (!ts.isCallExpression(node)) return;

    const isSdkCall =
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(file) === "sdk";
    const method = isSdkCall ? node.expression.name.text : undefined;
    if (method === "registerFunction") {
      const id = stringValue(node.arguments[0]);
      if (id) functions.push(id);
      return;
    }
    const isApiTriggerCall =
      ts.isIdentifier(node.expression) &&
      node.expression.text === "registerApiTrigger";
    if (method !== "registerTrigger" && !isApiTriggerCall) return;

    const options = node.arguments[0];
    const config = property(options, "config");
    const type = stringValue(property(options, "type"));
    if (type !== "http") return;

    const routePath = stringValue(property(config, "api_path"));
    const httpMethod = stringValue(property(config, "http_method"));
    const functionId = stringValue(property(options, "function_id"));
    if (!routePath || !httpMethod || !functionId) {
      throw new Error(
        `Unparseable HTTP trigger at src/triggers/api.ts:${
          file.getLineAndCharacterOfPosition(node.getStart()).line + 1
        }`,
      );
    }

    const middleware = stringArray(
      property(config, "middleware_function_ids"),
    );
    const key = `${httpMethod} ${routePath}`;
    const protectedByRegistration =
      isApiTriggerCall ||
      middleware.includes("middleware::api-auth");
    routes.push({
      surface_id: `REST:${httpMethod}:${routePath}`,
      method: httpMethod,
      path: routePath,
      function_id: functionId,
      middleware,
      registration: isApiTriggerCall ? "protected-wrapper" : "raw",
      auth_control: publicRoutes.has(key)
        ? "public-health"
        : protectedByRegistration
          ? "required"
          : "missing",
      source: `src/triggers/api.ts:${
        file.getLineAndCharacterOfPosition(node.getStart()).line + 1
      }`,
    });
  });

  return {
    functions: functions.sort(),
    routes: routes.sort((a, b) =>
      `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`),
    ),
  };
}

function hookInventory() {
  const path = join(root, "tsdown.config.ts");
  const { file } = sourceFile(path);
  const hooks = [];
  walk(file, (node) => {
    if (
      !ts.isVariableDeclaration(node) ||
      node.name.getText(file) !== "hookEntries" ||
      !node.initializer ||
      !ts.isArrayLiteralExpression(node.initializer)
    ) {
      return;
    }
    for (const element of node.initializer.elements) {
      const value = stringValue(element);
      if (value) hooks.push(value);
    }
  });
  return hooks.sort();
}

function providerFiles(path) {
  const files = [];
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) files.push(...providerFiles(full));
    else if (entry.endsWith(".ts")) files.push(full);
  }
  return files;
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function repositoryIdentity(paths) {
  const digest = createHash("sha256");
  for (const path of [...paths].sort()) {
    digest.update(path);
    digest.update("\0");
    digest.update(readFileSync(join(root, path)));
    digest.update("\0");
  }
  return {
    commit_sha: runGit(["rev-parse", "HEAD"]),
    commit_tree_sha: runGit(["rev-parse", "HEAD^{tree}"]),
    inventory_input_sha256: digest.digest("hex"),
  };
}

function providerInventory() {
  const providers = [];
  for (const path of providerFiles(join(root, "src/providers"))) {
    inventoryInputPaths.add(relative(root, path));
    const { file } = sourceFile(path);
    walk(file, (node) => {
      if (
        ts.isClassDeclaration(node) &&
        node.name?.text.endsWith("Provider")
      ) {
        providers.push({
          name: node.name.text,
          source: `${relative(root, path)}:${
            file.getLineAndCharacterOfPosition(node.getStart()).line + 1
          }`,
        });
      }
    });
  }
  return providers.sort((a, b) => a.name.localeCompare(b.name));
}

function providerAttemptInventory() {
  const providerMethods = new Set([
    "compress",
    "summarize",
    "describeImage",
    "embed",
    "embedBatch",
    "embedImage",
  ]);
  const attempts = [];
  for (const path of providerFiles(join(root, "src"))) {
    const relativePath = relative(root, path);
    inventoryInputPaths.add(relativePath);
    const { file } = sourceFile(path);
    walk(file, (node) => {
      if (!ts.isCallExpression(node)) return;
      const line =
        file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const expression = node.expression;
      const callee = expression.getText(file);
      let method;
      let receiver;
      if (ts.isPropertyAccessExpression(expression)) {
        method = expression.name.text;
        receiver = expression.expression.getText(file);
      } else if (ts.isIdentifier(expression)) {
        method = expression.text;
      }

      const providerInvocation =
        method &&
        providerMethods.has(method) &&
        !(
          relativePath.startsWith("src/providers/") &&
          receiver === "this"
        );
      const providerTransport =
        relativePath.startsWith("src/providers/") &&
        (method === "fetchWithTimeout" ||
          callee.endsWith(".messages.create") ||
          (relativePath === "src/providers/agent-sdk.ts" &&
            method === "query"));
      if (!providerInvocation && !providerTransport) return;

      let purpose = "query";
      if (relativePath.includes("migrate")) purpose = "migration";
      else if (
        relativePath.includes("vision") ||
        method === "describeImage" ||
        method === "embedImage"
      ) {
        purpose = "vision";
      } else if (
        method === "embed" ||
        method === "embedBatch" ||
        relativePath.includes("/embedding/")
      ) {
        purpose = "embedding";
      } else if (relativePath.includes("fallback-chain")) {
        purpose = "fallback";
      } else if (providerTransport) {
        purpose = "transport";
      }

      attempts.push({
        surface_id: `PROVIDER:ATTEMPT:${relativePath}:${line}:${method}`,
        purpose,
        kind: providerInvocation ? "invocation" : "transport",
        method,
        receiver: receiver ?? null,
        source: `${relativePath}:${line}`,
      });
    });
  }
  return attempts.sort((a, b) =>
    a.surface_id.localeCompare(b.surface_id),
  );
}

function linksForSurface(surface) {
  const haystack = `${surface.surface_id} ${surface.source}`.toLowerCase();
  let key = "auth";
  if (surface.type === "provider-adapter" || surface.type === "provider-attempt") {
    key = "provider";
  } else if (surface.type.startsWith("viewer")) {
    key = "viewer";
  } else if (
    surface.type === "host-connector" ||
    surface.type === "host-hook-event"
  ) {
    key = "connector";
  } else if (surface.type === "packaged-hook") {
    if (/pre-compact|context/.test(haystack)) key = "context";
    else if (/commit/.test(haystack)) key = "provenance";
    else if (/session|subagent|task-completed/.test(haystack)) key = "session";
    else key = "capture";
  } else if (/promotion|lesson|insight|remember/.test(haystack)) {
    key = "promotion";
  } else if (/context|recall|search|file-history/.test(haystack)) {
    key = "context";
  } else if (/commit|provenance/.test(haystack)) {
    key = "provenance";
  } else if (/health|slot|viewer/.test(haystack)) {
    key = "health";
  } else if (/migrat|snapshot|restore|index/.test(haystack)) {
    key = "migration";
  } else if (/session|agent|handoff/.test(haystack)) {
    key = "session";
  } else if (/project|scope/.test(haystack)) {
    key = "identity";
  }
  const links = CONTROL_LINKS[key];
  return {
    control_ids: [...links.control_ids],
    requirements: [...links.requirements],
    risks: [...links.risks],
    tests: [...links.tests],
  };
}

function namedObjectArray(path, variableName, key) {
  const { file } = sourceFile(path);
  const values = [];
  walk(file, (node) => {
    if (
      !ts.isVariableDeclaration(node) ||
      node.name.getText(file) !== variableName ||
      !node.initializer ||
      !ts.isArrayLiteralExpression(node.initializer)
    ) {
      return;
    }
    for (const element of node.initializer.elements) {
      const value = stringValue(property(element, key));
      if (value) values.push(value);
    }
  });
  return values.sort();
}

function mcpProtocolInventory() {
  const path = join(root, "src/mcp/server.ts");
  const { file } = sourceFile(path);
  const routes = [];
  walk(file, (node) => {
    if (
      !ts.isCallExpression(node) ||
      !ts.isPropertyAccessExpression(node.expression) ||
      node.expression.expression.getText(file) !== "sdk" ||
      node.expression.name.text !== "registerTrigger"
    ) {
      return;
    }
    const options = node.arguments[0];
    const config = property(options, "config");
    if (stringValue(property(options, "type")) !== "http") return;
    const routePath = stringValue(property(config, "api_path"));
    const method = stringValue(property(config, "http_method"));
    const functionId = stringValue(property(options, "function_id"));
    if (routePath && method && functionId) {
      routes.push({
        surface_id: `MCP:HTTP:${method}:${routePath}`,
        method,
        path: routePath,
        function_id: functionId,
        auth_control: "required",
      });
    }
  });
  return {
    transport_routes: routes.sort((a, b) => a.surface_id.localeCompare(b.surface_id)),
    resources: namedObjectArray(path, "MCP_RESOURCES", "uri"),
    prompts: namedObjectArray(path, "MCP_PROMPTS", "name"),
    standalone_fallback_tools: namedObjectArray(
      join(root, "src/mcp/standalone.ts"),
      "IMPLEMENTED_TOOLS",
      "name",
    ),
  };
}

function standaloneTools() {
  const { file } = sourceFile(join(root, "src/mcp/standalone.ts"));
  const tools = [];
  walk(file, (node) => {
    if (
      !ts.isVariableDeclaration(node) ||
      node.name.getText(file) !== "IMPLEMENTED_TOOLS" ||
      !node.initializer ||
      !ts.isNewExpression(node.initializer) ||
      node.initializer.expression.getText(file) !== "Set" ||
      !node.initializer.arguments?.[0] ||
      !ts.isArrayLiteralExpression(node.initializer.arguments[0])
    ) {
      return;
    }
    tools.push(
      ...node.initializer.arguments[0].elements
        .map(stringValue)
        .filter(Boolean),
    );
  });
  return tools.sort();
}

function connectorInventory() {
  const path = join(root, "src/cli/connect/index.ts");
  const { file } = sourceFile(path);
  const connectors = [];
  walk(file, (node) => {
    if (
      !ts.isVariableDeclaration(node) ||
      node.name.getText(file) !== "ADAPTERS" ||
      !node.initializer
    ) {
      return;
    }
    const initializer = ts.isAsExpression(node.initializer)
      ? node.initializer.expression
      : node.initializer;
    if (!ts.isArrayLiteralExpression(initializer)) return;
    connectors.push(
      ...initializer.elements.map((element) => element.getText(file)),
    );
  });
  return connectors.sort();
}

function hostManifestInventory() {
  const manifests = [
    "plugin/hooks/hooks.json",
    "plugin/hooks/hooks.codex.json",
    "plugin/hooks/hooks.copilot.json",
    "integrations/hermes/plugin.yaml",
    "integrations/openclaw/plugin.yaml",
  ];
  return manifests.map((manifest) => {
    const raw = readFileSync(join(root, manifest), "utf8");
    const parsed = manifest.endsWith(".json") ? JSON.parse(raw) : parseYaml(raw);
    const hooks = parsed?.hooks;
    const events = Array.isArray(hooks) ? hooks : Object.keys(hooks ?? {});
    return { manifest, events: [...events].sort(), event_count: events.length };
  });
}

function viewerInventory() {
  const htmlPath = join(root, "src/viewer/index.html");
  const html = readFileSync(htmlPath, "utf8");
  const calls = new Set();
  for (const match of html.matchAll(/\bapi(?:Get|Post|Put|Delete)?\(\s*['"`]([^'"`]+)['"`]/g)) {
    calls.add(match[1]);
  }
  return {
    server_paths: ["/", "/agentmemory/viewer", "/agentmemory/viewer/"],
    generic_rest_proxy: true,
    ui_rest_expressions: [...calls].sort(),
  };
}

const api = apiInventory();
const mcpTools = getAllTools()
  .map((tool) => {
    const schema = tool.inputSchema ?? {};
    const properties = Object.keys(schema.properties ?? {});
    return {
      surface_id: `MCP:TOOL:${tool.name}`,
      name: tool.name,
      required: [...(schema.required ?? [])].sort(),
      project_parameter: properties.includes("project"),
      scope_parameter: properties.includes("scope"),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
const hooks = hookInventory();
const providers = providerInventory();
const providerAttempts = providerAttemptInventory();
const mcpProtocol = mcpProtocolInventory();
mcpProtocol.standalone_fallback_tools = standaloneTools();
const hostManifests = hostManifestInventory();
const connectors = connectorInventory();
const viewer = viewerInventory();
const missingAuth = api.routes.filter(
  (route) => route.auth_control === "missing",
);
const surfaces = [
  ...api.routes.map((route) => ({
    surface_id: route.surface_id,
    type: "rest",
    source: route.source,
    auth_control: route.auth_control,
  })),
  ...mcpProtocol.transport_routes.map((route) => ({
    surface_id: route.surface_id,
    type: "mcp-transport",
    source: "src/mcp/server.ts",
    auth_control: route.auth_control,
  })),
  ...mcpTools.map((tool) => ({
    surface_id: tool.surface_id,
    type: "mcp-tool",
    source: "src/mcp/tools-registry.ts",
    auth_control: "transport-required",
  })),
  ...mcpProtocol.resources.map((uri) => ({
    surface_id: `MCP:RESOURCE:${uri}`,
    type: "mcp-resource",
    source: "src/mcp/server.ts",
    auth_control: "transport-required",
  })),
  ...mcpProtocol.prompts.map((name) => ({
    surface_id: `MCP:PROMPT:${name}`,
    type: "mcp-prompt",
    source: "src/mcp/server.ts",
    auth_control: "transport-required",
  })),
  ...mcpProtocol.standalone_fallback_tools.map((name) => ({
    surface_id: `MCP:STANDALONE-FALLBACK:${name}`,
    type: "mcp-standalone-fallback",
    source: "src/mcp/standalone.ts",
    auth_control: "local-process",
  })),
  ...hooks.map((name) => ({
    surface_id: `HOOK:PACKAGED:${name}`,
    type: "packaged-hook",
    source: "tsdown.config.ts",
    auth_control: "service-secret",
  })),
  ...connectors.map((name) => ({
    surface_id: `CONNECTOR:${name}`,
    type: "host-connector",
    source: "src/cli/connect/index.ts",
    auth_control: "connector-specific",
  })),
  ...hostManifests.flatMap((manifest) =>
    manifest.events.map((event) => ({
      surface_id: `HOOK:HOST:${manifest.manifest}:${event}`,
      type: "host-hook-event",
      source: manifest.manifest,
      auth_control: "service-secret",
    })),
  ),
  ...viewer.ui_rest_expressions.map((expression) => ({
    surface_id: `VIEWER:REST:${expression}`,
    type: "viewer-rest-call",
    source: "src/viewer/index.html",
    auth_control: expression === "health" ? "public-health" : "viewer-session",
  })),
  {
    surface_id: "VIEWER:REST-PROXY:*",
    type: "viewer-rest-proxy",
    source: "src/viewer/server.ts",
    auth_control: "viewer-session",
  },
  ...providers.map((provider) => ({
    surface_id: `PROVIDER:${provider.name}`,
    type: "provider-adapter",
    source: provider.source,
    auth_control: "processing-policy",
  })),
  ...providerAttempts.map((attempt) => ({
    ...attempt,
    type: "provider-attempt",
    auth_control: "processing-policy",
  })),
];
const tracedSurfaces = surfaces.map((surface) => ({
  ...surface,
  ...linksForSurface(surface),
}));
const sourceIdentity = repositoryIdentity(inventoryInputPaths);

const inventory = {
  schema_version: 2,
  control_id: "G-ICM-01",
  project_id: "github.com/chronodeai/agentmemory",
  source_identity: sourceIdentity,
  public_route_allowlist: [...publicRoutes].sort(),
  counts: {
    registered_api_functions: api.functions.length,
    http_routes: api.routes.length,
    public_routes: api.routes.filter(
      (route) => route.auth_control === "public-health",
    ).length,
    protected_routes: api.routes.filter(
      (route) => route.auth_control === "required",
    ).length,
    missing_auth_routes: missingAuth.length,
    mcp_tools: mcpTools.length,
    mcp_transport_routes: mcpProtocol.transport_routes.length,
    mcp_resources: mcpProtocol.resources.length,
    mcp_prompts: mcpProtocol.prompts.length,
    mcp_standalone_fallback_tools:
      mcpProtocol.standalone_fallback_tools.length,
    hooks: hooks.length,
    host_hook_manifests: hostManifests.length,
    host_hook_events: hostManifests.reduce(
      (total, manifest) => total + manifest.event_count,
      0,
    ),
    viewer_ui_rest_expressions: viewer.ui_rest_expressions.length,
    provider_adapters: providers.length,
    provider_attempt_sites: providerAttempts.length,
    host_connectors: connectors.length,
  },
  rest: api.routes,
  mcp_transport: mcpProtocol.transport_routes,
  mcp_tools: mcpTools,
  mcp_resources: mcpProtocol.resources,
  mcp_prompts: mcpProtocol.prompts,
  mcp_standalone_fallback_tools: mcpProtocol.standalone_fallback_tools,
  hooks,
  host_hook_manifests: hostManifests,
  viewer,
  provider_adapters: providers,
  provider_attempt_sites: providerAttempts,
  host_connectors: connectors,
  surfaces: tracedSurfaces,
};

const rendered = `${JSON.stringify(inventory, null, 2)}\n`;
if (checkOnly) {
  const existing = readFileSync(outputPath, "utf8");
  const stored = JSON.parse(existing);
  const storedCommit = stored?.source_identity?.commit_sha;
  const storedTree = stored?.source_identity?.commit_tree_sha;
  if (
    typeof storedCommit !== "string" ||
    !/^[a-f0-9]{40}$/.test(storedCommit) ||
    typeof storedTree !== "string" ||
    !/^[a-f0-9]{40}$/.test(storedTree)
  ) {
    throw new Error(
      `${relative(root, outputPath)} has invalid source identity`,
    );
  }
  const actualStoredTree = runGit(["rev-parse", `${storedCommit}^{tree}`]);
  if (actualStoredTree !== storedTree) {
    throw new Error(
      `${relative(root, outputPath)} source tree does not match its commit`,
    );
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", storedCommit, "HEAD"], {
      cwd: root,
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      `${relative(root, outputPath)} source commit is not an ancestor of HEAD`,
    );
  }
  const comparable = {
    ...inventory,
    source_identity: {
      ...inventory.source_identity,
      commit_sha: storedCommit,
      commit_tree_sha: storedTree,
    },
  };
  if (existing !== `${JSON.stringify(comparable, null, 2)}\n`) {
    throw new Error(
      `${relative(root, outputPath)} is stale; run npm run evidence:interfaces`,
    );
  }
  if (missingAuth.length > 0) {
    throw new Error(
      `${missingAuth.length} protected REST routes do not declare middleware::api-auth`,
    );
  }
  console.log(
    `G-ICM-01 inventory current: ${api.routes.length} REST, ${mcpProtocol.transport_routes.length} MCP transport, ${mcpTools.length} tools, ${hooks.length} hooks, ${connectors.length} connectors`,
  );
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered, "utf8");
  console.log(
    `Wrote ${relative(root, outputPath)} (${missingAuth.length} missing-auth routes)`,
  );
}
