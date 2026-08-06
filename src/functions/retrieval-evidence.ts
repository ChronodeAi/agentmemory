import type { CompressedObservation } from "../types.js";

const RETRIEVAL_TITLE_PATTERN =
  /(?:mcp__agentmemory__|\bmemory_(?:context_packet|recall|smart_search|file_history|sessions|graph_query|profile|project_health|diagnose)\b|^(?:view|read|load) context from (?:agent\s*)?memory file$)/i;

export function isRetrievalGeneratedObservation(
  observation: Pick<CompressedObservation, "title" | "recalledOnly">,
): boolean {
  return (
    observation.recalledOnly === true ||
    RETRIEVAL_TITLE_PATTERN.test(observation.title)
  );
}
