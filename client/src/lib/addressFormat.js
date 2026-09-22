// Recognises what kind of address has been typed, so the scan form can
// respond as you type (e.g. a Bitcoin address has no network to choose).
//
// Mirrors detect_address_kind in ml-service/app/address_format.py - same
// patterns, same order. Change both together. This is a HINT only: it never
// blocks a scan. The backend remains the authority and explains anything
// it can't recognise.

const BASE58 = "[1-9A-HJ-NP-Za-km-z]";

const EVM_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const LTC_BECH32_PATTERN = /^ltc1[023456789ac-hj-np-z]{8,87}$/;
const BTC_BECH32_PATTERN = /^bc1[023456789ac-hj-np-z]{8,87}$/;
const LTC_LEGACY_PATTERN = new RegExp(`^[LM]${BASE58}{24,33}$`);
const BTC_LEGACY_PATTERN = new RegExp(`^[13]${BASE58}{24,33}$`);

/** "evm" | "btc" | "ltc" | null */
export function detectAddressKind(address) {
  const candidate = address.trim();
  if (EVM_PATTERN.test(candidate)) return "evm";

  // Bech32 before legacy, as the backend does.
  const lowered = candidate.toLowerCase();
  if (LTC_BECH32_PATTERN.test(lowered)) return "ltc";
  if (BTC_BECH32_PATTERN.test(lowered)) return "btc";

  if (LTC_LEGACY_PATTERN.test(candidate)) return "ltc";
  if (BTC_LEGACY_PATTERN.test(candidate)) return "btc";
  return null;
}

export const ADDRESS_KINDS = {
  evm: { label: "EVM address", network: null },
  btc: { label: "Bitcoin address", network: "Bitcoin" },
  ltc: { label: "Litecoin address", network: "Litecoin" },
};
