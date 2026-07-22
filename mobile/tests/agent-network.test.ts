import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  agentRetryDelayMs,
  createAgentRequestId,
  shouldRetryAgentRequest,
} from '../src/services/agent-network.ts';

Deno.test('creates a stable bounded idempotency key format', () => {
  const requestId = createAgentRequestId('intake', 1_721_638_800_000, 0.25);
  assert(requestId.startsWith('intake-'));
  assert(requestId.length >= 16 && requestId.length <= 128);
  assertEquals(/^[a-zA-Z0-9][a-zA-Z0-9._:-]+$/.test(requestId), true);
});

Deno.test('retries transport failures and an in-progress replay', () => {
  assert(shouldRetryAgentRequest({
    attempt: 1,
    maxAttempts: 3,
    code: 'NETWORK_ERROR',
  }));
  assert(shouldRetryAgentRequest({
    attempt: 2,
    maxAttempts: 3,
    code: 'HTTP_ERROR',
    status: 409,
    serverCode: 'REQUEST_IN_PROGRESS',
  }));
  assertEquals(shouldRetryAgentRequest({
    attempt: 3,
    maxAttempts: 3,
    code: 'NETWORK_ERROR',
  }), false);
});

Deno.test('does not retry permanent clinical or quota errors', () => {
  assertEquals(shouldRetryAgentRequest({
    attempt: 1,
    maxAttempts: 3,
    code: 'HTTP_ERROR',
    status: 400,
  }), false);
  assertEquals(shouldRetryAgentRequest({
    attempt: 1,
    maxAttempts: 3,
    code: 'HTTP_ERROR',
    status: 429,
  }), false);
  assertEquals(agentRetryDelayMs(1, 10_000), 5_000);
});
