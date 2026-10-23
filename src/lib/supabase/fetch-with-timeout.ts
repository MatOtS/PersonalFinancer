// How long a request to the authentication service may take (FR-5).
export const AUTH_TIMEOUT_MS = 15_000;

// A fetch that cancels the request after timeoutMs. If the caller already
// passes its own signal, either one can cancel it.
export function createFetchWithTimeout(
  timeoutMs: number,
  baseFetch: typeof fetch = fetch,
): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    return baseFetch(input, { ...init, signal });
  };
}
