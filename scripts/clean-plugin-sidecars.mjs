import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptsDirectory = fileURLToPath(
  new URL("../plugin/scripts/", import.meta.url),
);

for (const entry of readdirSync(scriptsDirectory, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!entry.name.endsWith(".map") && !entry.name.endsWith(".d.mts")) {
    continue;
  }
  rmSync(new URL(`../plugin/scripts/${entry.name}`, import.meta.url));
}
