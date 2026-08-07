const MODEL_DIMENSIONS: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

const DEFAULT_DIMENSIONS = 1536;

function lookupModelDimensions(model: string): number | undefined {
  if (model in MODEL_DIMENSIONS) return MODEL_DIMENSIONS[model];
  const slash = model.indexOf("/");
  if (slash === -1) return undefined;
  return MODEL_DIMENSIONS[model.slice(slash + 1)];
}

export function resolveDimensions(
  model: string,
  override: string | undefined,
  envName: string,
): number {
  if (override !== undefined && override.trim().length > 0) {
    const parsed = parseInt(override, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${envName} must be a positive integer, got: ${override}`);
    }
    return parsed;
  }

  return lookupModelDimensions(model) ?? DEFAULT_DIMENSIONS;
}

export { DEFAULT_DIMENSIONS, MODEL_DIMENSIONS };
