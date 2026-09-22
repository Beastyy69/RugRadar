// Small display helpers shared by the views.

const TIME_UNITS = [
  { seconds: 31536000, unit: "year" },
  { seconds: 2592000, unit: "month" },
  { seconds: 604800, unit: "week" },
  { seconds: 86400, unit: "day" },
  { seconds: 3600, unit: "hour" },
  { seconds: 60, unit: "minute" },
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/**
 * "2 minutes ago", "yesterday"... Returns "" for a missing or unparseable
 * date, so one malformed record can't break the list it appears in.
 */
export function formatRelativeTime(isoDate, now = Date.now()) {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) return "";

  const elapsed = (timestamp - now) / 1000;
  for (const { seconds, unit } of TIME_UNITS) {
    if (Math.abs(elapsed) >= seconds) {
      return relativeFormatter.format(Math.round(elapsed / seconds), unit);
    }
  }
  return "just now";
}

/** Full local date and time, for tooltips. */
export function formatAbsoluteTime(isoDate) {
  const timestamp = Date.parse(isoDate);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toLocaleString();
}

/** "0xc02aaa39...83c756cc2" - keeps both ends, which is how people compare addresses. */
export function shortenAddress(address, leading = 10, trailing = 8) {
  if (typeof address !== "string" || address.length <= leading + trailing + 3) {
    return address || "";
  }
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`;
}

const CHAIN_NAMES = {
  1: "Ethereum",
  56: "BSC",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  btc: "Bitcoin",
  ltc: "Litecoin",
};

/** A readable chain name, falling back to the raw id for chains we don't label. */
export function chainName(chainId) {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}

const ADDRESS_TYPE_LABELS = {
  token: "Token",
  address: "Wallet / contract",
  utxo_address: "Address",
};

export function addressTypeLabel(addressType) {
  return ADDRESS_TYPE_LABELS[addressType] ?? "Address";
}
