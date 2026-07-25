import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(
  readFileSync(join(root, "ci/iii-engine-sha256.json"), "utf8"),
);
const key = `${process.platform}-${process.arch}`;
const asset = manifest.assets[key];
if (!asset) throw new Error(`unsupported iii-engine profile: ${key}`);

const response = await fetch(`${manifest.base_url}/${asset.name}`);
if (!response.ok) {
  throw new Error(`iii-engine download failed: HTTP ${response.status}`);
}
const archive = Buffer.from(await response.arrayBuffer());
const digest = createHash("sha256").update(archive).digest("hex");
if (digest !== asset.sha256) {
  throw new Error(
    `iii-engine archive checksum mismatch: expected ${asset.sha256}, got ${digest}`,
  );
}

const temp = mkdtempSync(join(tmpdir(), "agentmemory-iii-"));
try {
  const archivePath = join(temp, asset.name);
  writeFileSync(archivePath, archive);
  const extracted = join(temp, "extracted");
  mkdirSync(extracted);
  const untar = spawnSync("tar", ["-xzf", archivePath, "-C", extracted], {
    encoding: "utf8",
  });
  if (untar.status !== 0) {
    throw new Error(`iii-engine extraction failed: ${untar.stderr.trim()}`);
  }
  const find = spawnSync("find", [extracted, "-type", "f", "-name", "iii"], {
    encoding: "utf8",
  });
  const binary = find.stdout.trim().split("\n").filter(Boolean)[0];
  if (!binary) throw new Error("iii-engine archive did not contain iii");

  const targetDir = join(homedir(), ".agentmemory", "bin");
  const target = join(targetDir, "iii");
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(binary, target);
  chmodSync(target, 0o755);
  writeFileSync(
    `${target}.provenance.json`,
    `${JSON.stringify(
      {
        version: manifest.version,
        asset: asset.name,
        archive_sha256: digest,
        binary_sha256: createHash("sha256")
          .update(readFileSync(target))
          .digest("hex"),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Installed verified iii-engine ${manifest.version} for ${key}`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
