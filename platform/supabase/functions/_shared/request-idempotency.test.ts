import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isRequestLedgerStale,
  normalizeClientRequestId,
} from "./request-idempotency.ts";

Deno.test("accepts a bounded client request id", () => {
  assertEquals(
    normalizeClientRequestId("intake-mabc1234-a1b2c3d4"),
    "intake-mabc1234-a1b2c3d4",
  );
});

Deno.test("rejects missing, short, or unsafe client request ids", () => {
  assertEquals(normalizeClientRequestId(undefined), null);
  assertEquals(normalizeClientRequestId("short"), null);
  assertEquals(normalizeClientRequestId("request id with spaces"), null);
});

Deno.test("only reclaims an idempotency request after the stale window", () => {
  const now = Date.parse("2026-07-22T08:00:00.000Z");
  assertEquals(
    isRequestLedgerStale("2026-07-22T07:59:00.000Z", now),
    false,
  );
  assertEquals(
    isRequestLedgerStale("2026-07-22T07:58:44.000Z", now),
    true,
  );
});
