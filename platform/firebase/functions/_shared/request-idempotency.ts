const CLIENT_REQUEST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;

export function normalizeClientRequestId(value: unknown): string | null {
  const requestId = typeof value === "string" ? value.trim() : "";
  return CLIENT_REQUEST_ID_PATTERN.test(requestId) ? requestId : null;
}

export function isRequestLedgerStale(
  updatedAt: string,
  nowMs = Date.now(),
  staleAfterMs = 75_000,
): boolean {
  const updatedAtMs = Date.parse(updatedAt);
  return Number.isFinite(updatedAtMs) && nowMs - updatedAtMs >= staleAfterMs;
}
