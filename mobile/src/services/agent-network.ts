export type AgentTransportCode =
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'REQUEST_IN_PROGRESS'
  | 'AUTH_REQUIRED'
  | 'NOT_CONFIGURED';

interface RetryDecisionInput {
  attempt: number;
  maxAttempts: number;
  code: AgentTransportCode;
  status?: number;
  serverCode?: string;
}

export const AGENT_REQUEST_TIMEOUT_MS = 42_000;
export const AGENT_REQUEST_MAX_ATTEMPTS = 3;

export function createAgentRequestId(
  prefix = 'agent',
  now = Date.now(),
  randomValue = Math.random(),
) {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'agent';
  const randomPart = Math.floor(randomValue * 0xFFFFFFFFFFFF)
    .toString(36)
    .padStart(9, '0');
  return `${safePrefix}-${now.toString(36)}-${randomPart}`;
}

export function shouldRetryAgentRequest({
  attempt,
  maxAttempts,
  code,
  status,
  serverCode,
}: RetryDecisionInput) {
  if (attempt >= maxAttempts) return false;
  if (code === 'NETWORK_ERROR') return true;
  if (serverCode === 'REQUEST_IN_PROGRESS') return true;
  return code === 'HTTP_ERROR' && Boolean(status && [408, 502, 503, 504].includes(status));
}

export function agentRetryDelayMs(attempt: number, retryAfterMs?: number) {
  if (typeof retryAfterMs === 'number' && Number.isFinite(retryAfterMs)) {
    return Math.min(Math.max(retryAfterMs, 250), 5_000);
  }
  const delays = [600, 1_500, 3_000];
  return delays[Math.min(Math.max(attempt - 1, 0), delays.length - 1)] ?? 3_000;
}
