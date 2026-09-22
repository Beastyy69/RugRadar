// The centre of the report: the verdict, how strong it is, and in one
// sentence why - with what was scanned alongside it.
//
// Every word is derived from the scan response. An "unknown" verdict never
// shows a number: its 0 means "no evidence", and 0/100 would read as safe.

import { animate, m, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

import { EASE } from "../../lib/motion";
import { LEVEL_BANDS, riskLevelStyle } from "../../lib/risk";
import { chainName } from "../../lib/scanChecks";
import Icon from "../landing/Icon";

const LEVEL_HEADLINES = { low: "Low risk", medium: "Medium risk", high: "High risk", unknown: "Unknown" };
const LEVEL_ICONS = { low: "shield", medium: "alert", high: "alert", unknown: "circle" };

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function summarise(level, riskCount) {
  switch (level) {
    case "high":
      return {
        headline: `${plural(riskCount, "finding")} put${riskCount === 1 ? "s" : ""} this address in the high-risk range.`,
        support: "Review the findings below before interacting with it.",
      };
    case "medium":
      return {
        headline: `${plural(riskCount, "finding")} raise${riskCount === 1 ? "s" : ""} concern.`,
        support: "Review the findings below before interacting with it.",
      };
    case "low":
      return riskCount
        ? {
            headline: `Only minor indicators were found (${riskCount}).`,
            support: "A low score is not a guarantee of safety.",
          }
        : {
            headline: "No significant risk indicators were found.",
            support: "A low score is not a guarantee of safety.",
          };
    default:
      return {
        headline: "Insufficient security evidence was available to produce a confident assessment.",
        support: "Unknown is not the same as safe - treat this address with caution.",
      };
  }
}

function addressType(result) {
  if (result.address_type === "token") return "Token contract";
  if (result.address_type === "utxo_address") return `${chainName(result.chain_id)} address`;
  const onchain = result.onchain;
  if (!onchain) return "Wallet or contract";
  if (onchain.is_smart_account) return "Smart account (EIP-7702)";
  return onchain.is_contract ? "Contract" : "Wallet";
}

// How the network was chosen, worded to claim no more than the response
// shows: auto mode can fall back to Ethereum for a wallet without finding
// it, so only a matched token is called "detected".
function networkDescription(result, request, chains) {
  const name = chainName(result.chain_id, chains);
  if (result.address_type === "utxo_address") return name;
  if (request.chainId !== "auto") return `${name} · selected`;
  return result.address_type === "token" ? `${name} · detected` : `${name} · auto-selected`;
}

function CopyAddress({ address }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the
      // address is still selectable text, so there is nothing to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Address copied" : "Copy address"}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-tertiary transition-standard hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-secondary"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ScoreScale({ score, style }) {
  return (
    <div className="mt-6" aria-hidden="true">
      <div className="relative flex h-2 overflow-hidden rounded-full">
        {LEVEL_BANDS.map((band) => (
          <span key={band.level} className={band.fill} style={{ width: `${band.to - band.from}%` }} />
        ))}
        <m.span
          className={`absolute inset-y-0 left-0 rounded-full ${style.bar}`}
          initial={{ width: "0%" }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: EASE.enter, delay: 0.2 }}
        />
      </div>
      <div className="mt-2 flex text-xs text-text-tertiary">
        {LEVEL_BANDS.map((band) => (
          <span key={band.level} style={{ width: `${band.to - band.from}%` }}>
            {LEVEL_HEADLINES[band.level].replace(" risk", "")}
          </span>
        ))}
      </div>
    </div>
  );
}

function RiskOverview({ result, request, chains, riskCount }) {
  const level = result.level in LEVEL_HEADLINES ? result.level : "unknown";
  const style = riskLevelStyle(level);
  const isUnknown = level === "unknown";
  const { headline, support } = summarise(level, riskCount);
  const reduceMotion = useReducedMotion();

  const shown = useMotionValue(reduceMotion ? result.score : 0);
  const rounded = useTransform(shown, (value) => Math.round(value));
  useEffect(() => {
    if (reduceMotion) {
      shown.set(result.score);
      return undefined;
    }
    const controls = animate(shown, result.score, { duration: 0.9, ease: EASE.enter, delay: 0.2 });
    return () => controls.stop();
  }, [reduceMotion, result.score, shown]);

  const token = result.details?.name
    ? `${result.details.name}${result.details.symbol ? ` (${result.details.symbol})` : ""}`
    : null;
  const alsoOn = (result.also_found_on ?? []).map((chain) => chain.chain_name);

  return (
    <section
      aria-labelledby="assessment-title"
      className="rounded-2xl border border-border-default bg-surface-primary/80 p-6 sm:p-8"
    >
      <div className="grid gap-8 md:grid-cols-5 md:gap-10">
        <div className="md:col-span-2">
          <p className="font-technical text-xs font-medium tracking-widest text-brand-secondary uppercase">
            Security assessment
          </p>

          {isUnknown ? (
            <p className="mt-4 font-display text-5xl font-semibold tracking-tight text-risk-unknown">Unknown</p>
          ) : (
            <p className="mt-4 font-display leading-none" aria-hidden="true">
              <m.span className={`text-6xl font-semibold tabular-nums ${style.text}`}>{rounded}</m.span>
              <span className="ml-1 text-lg text-text-tertiary">/ 100</span>
            </p>
          )}

          <h2
            id="assessment-title"
            className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${style.badge}`}
          >
            <Icon name={LEVEL_ICONS[level]} className="h-4 w-4" />
            {isUnknown ? "Not enough evidence" : LEVEL_HEADLINES[level]}
            {!isUnknown && <span className="sr-only">, risk score {result.score} out of 100</span>}
          </h2>

          {isUnknown ? (
            <p className="mt-6 text-xs text-text-tertiary">
              No score is shown: RugRadar found no evidence either way.
            </p>
          ) : (
            <ScoreScale score={result.score} style={style} />
          )}
        </div>

        <div className="md:col-span-3 md:border-l md:border-border-subtle md:pl-10">
          <p className="font-display text-xl leading-snug text-text-primary sm:text-2xl">{headline}</p>
          <p className="mt-2 text-sm text-text-secondary">{support}</p>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="w-28 shrink-0 text-text-tertiary">Address</dt>
              <dd className="flex min-w-0 items-start gap-2">
                <span className="font-technical break-all text-text-primary">{result.address}</span>
                <CopyAddress address={result.address} />
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="w-28 shrink-0 text-text-tertiary">Type</dt>
              <dd className="text-text-primary">{addressType(result)}</dd>
            </div>
            {token && (
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                <dt className="w-28 shrink-0 text-text-tertiary">Token</dt>
                <dd className="text-text-primary">{token}</dd>
              </div>
            )}
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="w-28 shrink-0 text-text-tertiary">Network</dt>
              <dd className="text-text-primary">
                {networkDescription(result, request, chains)}
                {alsoOn.length > 0 && (
                  <span className="block text-xs text-text-tertiary">Also found on {alsoOn.join(", ")}</span>
                )}
              </dd>
            </div>
          </dl>

          {riskCount > 0 && (
            <a
              href="#findings"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-brand-secondary transition-standard hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
            >
              View {plural(riskCount, "finding")}
              <Icon name="chevron-down" className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default RiskOverview;
