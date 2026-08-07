// iii 0.11.2 uses tungstenite's 16 MiB WebSocket frame ceiling. Leave one
// MiB for SDK framing so a large response is refused before it can drop and
// re-register the worker.
export const SAFE_PAYLOAD_BYTES = 15 * 1024 * 1024;

export type OversizedPayload = {
  success: false;
  error: string;
  oversized: true;
  bytes: number;
  limitBytes: number;
};

export function payloadByteLength(payload: unknown): number {
  return Buffer.byteLength(JSON.stringify(payload) ?? "", "utf8");
}

export function checkPayloadFrameSize(
  payload: unknown,
  hint: string,
): OversizedPayload | null {
  const bytes = payloadByteLength(payload);
  if (bytes <= SAFE_PAYLOAD_BYTES) return null;
  return {
    success: false,
    error: `Response is ${(bytes / (1024 * 1024)).toFixed(1)} MiB, over the ~${SAFE_PAYLOAD_BYTES / (1024 * 1024)} MiB engine transport frame limit; ${hint}`,
    oversized: true,
    bytes,
    limitBytes: SAFE_PAYLOAD_BYTES,
  };
}
