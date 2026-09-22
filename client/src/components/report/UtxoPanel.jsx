// Bitcoin / Litecoin: no contracts, so the facts are the address's own
// activity profile from the block explorer.

import { formatAbsoluteTime } from "../../lib/format";
import InfoPanel from "./InfoPanel";

function coins(value, symbol) {
  return typeof value === "number" ? `${value.toLocaleString()} ${symbol}` : null;
}

function UtxoPanel({ profile }) {
  const rows = [
    { label: "Balance", value: coins(profile.balance, profile.symbol) },
    { label: "Total received", value: coins(profile.total_received, profile.symbol) },
    { label: "Total sent", value: coins(profile.total_sent, profile.symbol) },
    { label: "Transactions", value: typeof profile.tx_count === "number" ? profile.tx_count.toLocaleString() : null },
    {
      label: "Pending",
      value: profile.unconfirmed_tx_count ? profile.unconfirmed_tx_count.toLocaleString() : null,
    },
    { label: "Last active", value: profile.last_seen ? formatAbsoluteTime(profile.last_seen) : null },
    {
      label: "Earliest transaction fetched",
      value: profile.first_seen ? formatAbsoluteTime(profile.first_seen) : null,
      // Only the latest page is fetched (ml-service/app/utxo_client.py), so
      // for a busy address this is not its true first transaction.
      hint: profile.first_seen ? "From the most recent transactions only" : null,
    },
  ];

  return <InfoPanel eyebrow={profile.chain} title="Address activity" rows={rows} />;
}

export default UtxoPanel;
