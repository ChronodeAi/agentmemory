export type ContextEligibilityReason =
  | "expired"
  | "deleted"
  | "superseded"
  | "contradicted"
  | "unaccepted_gate_authority"
  | "recalled_only"
  | "stale_against_verified_lesson"
  | "low_signal_after_verified_lesson"
  | "provenance_missing";

export interface ContextEligibilityDecision {
  eligible: boolean;
  reason?: ContextEligibilityReason;
}

interface RetrievalQuarantineRecord {
  sourceScope?: string;
  sourceKey?: string;
}

interface ScopeLister {
  list<T>(scope: string): Promise<T[]>;
}

function stringValue(
  candidate: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = candidate[key];
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

function stringList(
  candidate: Record<string, unknown>,
  key: string,
): string[] {
  const value = candidate[key];
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && Boolean(entry.trim()),
      )
    : [];
}

export function evaluateContextCandidate(
  candidate: Record<string, unknown>,
  options: {
    contextClass: "advisory" | "gate-critical";
    candidateId?: string;
    now?: number;
  },
): ContextEligibilityDecision {
  const status = stringValue(candidate, "status")?.toLowerCase();
  const now = options.now ?? Date.now();
  const expiry =
    stringValue(candidate, "expiresAt") ??
    stringValue(candidate, "forgetAfter");
  if (expiry) {
    const expiresAt = new Date(expiry).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      return { eligible: false, reason: "expired" };
    }
  }
  if (candidate["deleted"] === true || status === "deleted") {
    return { eligible: false, reason: "deleted" };
  }
  if (
    candidate["isLatest"] === false ||
    status === "superseded" ||
    stringValue(candidate, "supersededBy")
  ) {
    return { eligible: false, reason: "superseded" };
  }
  if (candidate["contradicted"] === true || status === "contradicted") {
    return { eligible: false, reason: "contradicted" };
  }
  const gateAuthority =
    candidate["gateAuthority"] === true ||
    stringValue(candidate, "authority")?.toLowerCase() === "gate";
  const accepted =
    candidate["accepted"] === true ||
    status === "accepted" ||
    stringValue(candidate, "authorityStatus")?.toLowerCase() === "accepted";
  if (
    options.contextClass === "gate-critical" &&
    gateAuthority &&
    !accepted
  ) {
    return { eligible: false, reason: "unaccepted_gate_authority" };
  }
  const tags = stringList(candidate, "tags").map((tag) => tag.toLowerCase());
  if (
    candidate["recalledOnly"] === true ||
    stringValue(candidate, "source")?.toLowerCase() === "recall" ||
    tags.includes("recalled-only")
  ) {
    return { eligible: false, reason: "recalled_only" };
  }
  const provenanceIds = [
    options.candidateId,
    stringValue(candidate, "id"),
    stringValue(candidate, "obsId"),
    ...stringList(candidate, "sourceIds"),
    ...stringList(candidate, "sourceObservationIds"),
    stringValue(candidate, "commitSha"),
    stringValue(candidate, "receiptId"),
  ].filter((value): value is string => Boolean(value));
  if (provenanceIds.length === 0) {
    return { eligible: false, reason: "provenance_missing" };
  }
  return { eligible: true };
}

export function retrievalQuarantineKey(scope: string, key: string): string {
  return `${scope}\u0000${key}`;
}

export async function loadRetrievalQuarantine(
  kv: ScopeLister,
  scope: string,
): Promise<Set<string>> {
  const records = await kv.list<RetrievalQuarantineRecord>(scope);
  return new Set(
    records
      .filter(
        (record): record is Required<RetrievalQuarantineRecord> =>
          typeof record.sourceScope === "string" &&
          typeof record.sourceKey === "string",
      )
      .map((record) =>
        retrievalQuarantineKey(record.sourceScope, record.sourceKey),
      ),
  );
}
