// All calls to the Express backend live here, so components don't need to
// know about URLs or response shapes.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function getJson(path, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (error) {
    // A cancelled request is the caller's own decision, not an outage -
    // pass it through untouched so it can be told apart.
    if (error.name === "AbortError") throw error;
    // Otherwise fetch only rejects on network-level failures, not on 4xx/5xx.
    throw new Error("Could not reach the backend. Is the server running on port 4000?");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The backend forwards ml-service's { detail: "..." } error messages.
    throw new Error(body?.detail || `Request failed with status ${response.status}`);
  }

  return body;
}

/**
 * Scan any address - a token contract or a plain wallet.
 * Returns { address, chain_id, address_type, score, level, reasons, features }.
 * Pass an AbortSignal to be able to cancel it; a cancelled scan rejects
 * with an error named "AbortError".
 */
export async function scanToken(address, chainId = "auto", { signal } = {}) {
  return getJson(
    `/api/scan?address=${encodeURIComponent(address)}&chain_id=${encodeURIComponent(chainId)}`,
    { signal },
  );
}

/**
 * Past scans, newest first. The backend caps `limit` at 100.
 * Returns an array, or [] if the response carried none.
 */
export async function fetchHistory(limit = 20) {
  const body = await getJson(`/api/history?limit=${encodeURIComponent(limit)}`);
  return body?.scans ?? [];
}

/**
 * Which chains GoPlus supports, split by API.
 * Returns { token_security: [{name, id}], address_security: [{name, id}] }.
 */
export async function fetchChains() {
  return getJson("/api/chains");
}
