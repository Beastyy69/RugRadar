// What the address IS: where it lives, who made it, when, and what it
// holds. Token-security values that are findings in their own right (a
// honeypot, unlocked liquidity) are left to the findings - this is facts.

import { formatAbsoluteTime, formatRelativeTime, shortenAddress } from "../../lib/format";
import { chainName } from "../../lib/scanChecks";
import InfoPanel from "./InfoPanel";

const ZERO_ADDRESS = /^0x0{40}$/i;

function yesNo(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return value === "unknown" ? "Not reported" : null;
}

function holderValue(holder) {
  if (!holder?.address) return null;
  if (ZERO_ADDRESS.test(holder.address)) return "None (zero address)";
  const percent = typeof holder.percent === "number" && holder.percent > 0 ? ` · holds ${holder.percent}%` : "";
  return `${shortenAddress(holder.address)}${percent}`;
}

function accountType(onchain) {
  if (!onchain) return null;
  if (onchain.is_smart_account) return "Smart account (EIP-7702)";
  return onchain.is_contract ? "Contract" : "Wallet (externally owned)";
}

function ContractPanel({ result, chains }) {
  const isToken = result.address_type === "token";
  const { details, onchain, features } = result;
  const creation = result.activity?.creation;

  const rows = [
    { label: "Network", value: chainName(result.chain_id, chains) },
    { label: "Account type", value: isToken ? null : accountType(onchain) },
    { label: "Source verified", value: isToken ? yesNo(features?.is_open_source) : null },
    { label: "Upgradeable proxy", value: isToken ? yesNo(features?.is_proxy) : null },
    {
      label: "Created",
      value: creation?.created_at ? formatAbsoluteTime(creation.created_at) : null,
      hint: creation?.created_at ? formatRelativeTime(creation.created_at) : null,
    },
    {
      label: "Deployed by",
      value: creation?.creator ? shortenAddress(creation.creator) : null,
      technical: true,
      title: creation?.creator,
    },
    { label: "Creator", value: holderValue(details?.creator), technical: true, title: details?.creator?.address },
    { label: "Owner", value: holderValue(details?.owner), technical: true, title: details?.owner?.address },
    {
      label: "Balance",
      value: onchain ? `${Number(onchain.native_balance).toLocaleString()} ${onchain.native_symbol}` : null,
    },
    {
      label: "Code size",
      value: onchain?.bytecode_size_bytes ? `${onchain.bytecode_size_bytes.toLocaleString()} bytes` : null,
    },
    {
      label: "Delegates to",
      value: onchain?.delegates_to ? shortenAddress(onchain.delegates_to) : null,
      technical: true,
      title: onchain?.delegates_to,
      hint: onchain?.delegates_to ? "This wallet runs another contract's code (EIP-7702)." : null,
    },
  ];

  return (
    <InfoPanel
      eyebrow={isToken ? "Contract" : "Address"}
      title={isToken ? "Contract information" : "Address information"}
      rows={rows}
    />
  );
}

export default ContractPanel;
