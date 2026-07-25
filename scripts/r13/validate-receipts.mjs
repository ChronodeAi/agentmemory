import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const requirePass = process.argv.includes("--require-pass");
const targets = process.argv.slice(2).filter((arg) => arg !== "--require-pass");
if (targets.length === 0) {
  throw new Error("provide at least one receipt file or directory");
}

function receiptFiles(path) {
  const absolute = resolve(root, path);
  if (statSync(absolute).isFile()) return [absolute];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(absolute, entry.name);
    if (entry.isDirectory()) return receiptFiles(child);
    return entry.isFile() && entry.name === "receipt.json" ? [child] : [];
  });
}

const schema = JSON.parse(
  readFileSync(resolve(root, "schemas/r13-receipt.schema.json"), "utf8"),
);
const files = targets.flatMap(receiptFiles);
if (files.length === 0) throw new Error("no receipt.json files found");

function validateValue(value, rule, path = "$") {
  const errors = [];
  if (rule.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [`${path} must be an object`];
    }
    for (const key of rule.required ?? []) {
      if (!(key in value)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, child] of Object.entries(rule.properties ?? {})) {
      if (key in value) errors.push(...validateValue(value[key], child, `${path}.${key}`));
    }
    if (rule.additionalProperties && typeof rule.additionalProperties === "object") {
      for (const [key, childValue] of Object.entries(value)) {
        if (!(key in (rule.properties ?? {}))) {
          errors.push(
            ...validateValue(childValue, rule.additionalProperties, `${path}.${key}`),
          );
        }
      }
    }
  } else if (rule.type === "string") {
    if (typeof value !== "string") errors.push(`${path} must be a string`);
    else {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${path} must have at least ${rule.minLength} character(s)`);
      }
      if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
        errors.push(`${path} does not match ${rule.pattern}`);
      }
    }
  } else if (rule.type === "boolean" && typeof value !== "boolean") {
    errors.push(`${path} must be a boolean`);
  }
  if ("const" in rule && value !== rule.const) {
    errors.push(`${path} must equal ${JSON.stringify(rule.const)}`);
  }
  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${path} must be one of ${rule.enum.join(", ")}`);
  }
  return errors;
}

for (const file of files) {
  const receipt = JSON.parse(readFileSync(file, "utf8"));
  const errors = validateValue(receipt, schema);
  if (errors.length > 0) {
    throw new Error(
      `${file} failed schema validation: ${errors.join("; ")}`,
    );
  }
  if (requirePass && receipt.result !== "pass") {
    throw new Error(`${file} is not a passing qualification receipt`);
  }
}

console.log(`Validated ${files.length} R-13 receipt(s).`);
