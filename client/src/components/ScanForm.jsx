// The scanner's primary interaction: address in, network, Scan.
//
// The page owns the scanning itself; this collects input and reacts to it
// as you type - recognising the address format, and explaining exactly
// what the chosen network setting will do (including auto-detect's
// Ethereum fallback), so nothing about the scan is a black box.
//
// Text fields are 16px on phones: iOS Safari zooms the whole page when an
// input under 16px is focused.
//
// While a scan runs the button is disabled (no duplicate submissions) and
// the field is read-only rather than disabled, so the address can still be
// selected and copied.

import { m } from "framer-motion";
import { useId, useState } from "react";

import { ADDRESS_KINDS, detectAddressKind } from "../lib/addressFormat";
import { buttonClasses } from "../lib/buttonStyles";
import { AUTO_DETECT_CHAINS } from "../lib/landingContent";
import { SPRING } from "../lib/motion";
import Icon from "./landing/Icon";

const AUTO = "auto";

function listNames(names) {
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

// Plain-English account of what the network setting will do. Every
// sentence here describes real backend behaviour (ml-service chain_detect /
// chain_rpc) - nothing is implied that the scan doesn't do.
function networkExplanation(addressKind, chainId, chains) {
  if (addressKind === "btc" || addressKind === "ltc") {
    return `${ADDRESS_KINDS[addressKind].network} has one network, so it's set by the address itself.`;
  }
  if (chainId === AUTO) {
    return `Auto-detect looks for the token on ${listNames(AUTO_DETECT_CHAINS)}. For a wallet, it uses whichever of those the address is active on, or Ethereum if none.`;
  }
  const chain = chains.find((candidate) => String(candidate.id) === String(chainId));
  if (!chain) return "Scanning on the selected network only.";
  return chain.supportsAddressScan
    ? `Scanning on ${chain.name} only.`
    : `Scanning on ${chain.name} only. Wallet checks aren't available on this network - token contracts only.`;
}

// Hover: the button rises a pixel and the arrow leans forward. Press: it
// settles back. Both are springs, so nothing snaps.
const buttonMotion = {
  rest: { y: 0 },
  hover: { y: -1, transition: { type: "spring", ...SPRING.lift } },
  press: { y: 0, transition: { type: "spring", ...SPRING.lift } },
};
const arrowMotion = {
  rest: { x: 0 },
  hover: { x: 3, transition: { type: "spring", ...SPRING.lift } },
  press: { x: 1 },
};

function ScanButton({ isLoading, disabled }) {
  const interactive = !disabled && !isLoading;

  return (
    <m.button
      type="submit"
      disabled={disabled || isLoading}
      variants={buttonMotion}
      initial="rest"
      animate="rest"
      whileHover={interactive ? "hover" : undefined}
      whileTap={interactive ? "press" : undefined}
      className={`${buttonClasses()} w-full shrink-0 hover:shadow-glow-brand disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-text-disabled disabled:shadow-none sm:w-auto sm:min-w-44`}
    >
      {isLoading ? (
        <>
          <m.span
            aria-hidden="true"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
            className="inline-flex"
          >
            <Icon name="loader" className="h-4 w-4" />
          </m.span>
          Scanning...
        </>
      ) : (
        <>
          Scan address
          <m.span aria-hidden="true" variants={arrowMotion} className="inline-flex">
            <Icon name="arrow" className="h-4 w-4" />
          </m.span>
        </>
      )}
    </m.button>
  );
}

function ScanForm({ onScan, isLoading, chains }) {
  const [address, setAddress] = useState("");
  // "auto" lets the backend work out the chain itself - the common case.
  const [chainId, setChainId] = useState(AUTO);
  const ids = useId();
  const inputId = `${ids}-address`;
  const hintId = `${ids}-hint`;
  const networkId = `${ids}-network`;
  const explanationId = `${ids}-explanation`;

  const trimmed = address.trim();
  const addressKind = trimmed ? detectAddressKind(trimmed) : null;
  const networkFromAddress = addressKind === "btc" || addressKind === "ltc";
  // A <label> may only point at a form control; with no select, it's text.
  const NetworkLabel = networkFromAddress ? "p" : "label";

  function handleSubmit(event) {
    event.preventDefault();
    if (trimmed && !isLoading) {
      onScan(trimmed, chainId);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={isLoading}
      className="rounded-2xl border border-border-default bg-surface-primary/80 p-5 shadow-lift transition-standard focus-within:border-brand-primary/50 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          Token or wallet address
        </label>
        {/* Live format hint. Neutral colours on purpose: recognising a
            format says nothing about risk, so it must not look "safe". */}
        <p id={hintId} aria-live="polite" className="min-h-5 text-xs text-text-tertiary">
          {addressKind ? (
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <Icon name="check" className="h-3.5 w-3.5 text-brand-secondary" />
              {ADDRESS_KINDS[addressKind].label}
            </span>
          ) : trimmed ? (
            "Not a recognised address format yet"
          ) : (
            "EVM (0x...), Bitcoin or Litecoin"
          )}
        </p>
      </div>

      <div className="relative mt-3">
        <input
          id={inputId}
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Paste an address"
          readOnly={isLoading}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="search"
          aria-describedby={hintId}
          className="w-full rounded-lg border border-border-default bg-bg-secondary py-3.5 pr-11 pl-4 font-technical text-base text-text-primary transition-standard placeholder:text-text-disabled read-only:text-text-secondary focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15 focus:outline-none"
        />
        {address && !isLoading && (
          <button
            type="button"
            onClick={() => setAddress("")}
            aria-label="Clear address"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-text-tertiary transition-standard hover:bg-surface-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-secondary"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-72">
          <NetworkLabel
            htmlFor={networkFromAddress ? undefined : networkId}
            className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary"
          >
            <Icon name="network" className="h-3.5 w-3.5" />
            Network
          </NetworkLabel>
          {networkFromAddress ? (
            // Nothing to choose: show the network the address implies.
            <p
              id={networkId}
              className="mt-1.5 rounded-lg border border-border-subtle bg-bg-secondary px-3.5 py-3 text-sm text-text-secondary"
            >
              {ADDRESS_KINDS[addressKind].network}
            </p>
          ) : (
            <div className="relative mt-1.5">
              <select
                id={networkId}
                value={chainId}
                onChange={(event) => setChainId(event.target.value)}
                disabled={isLoading}
                aria-describedby={explanationId}
                className="w-full appearance-none rounded-lg border border-border-default bg-bg-secondary py-3 pr-10 pl-3.5 text-base text-text-primary transition-standard focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/15 focus:outline-none disabled:text-text-disabled sm:text-sm"
              >
                <option value={AUTO}>Auto-detect</option>
                {chains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                    {chain.supportsAddressScan ? "" : " (tokens only)"}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron-down"
                className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-tertiary"
              />
            </div>
          )}
        </div>

        <div className="sm:ml-auto">
          <ScanButton isLoading={isLoading} disabled={!trimmed} />
        </div>
      </div>

      <p id={explanationId} className="mt-3 text-xs leading-relaxed text-text-tertiary">
        {networkExplanation(addressKind, chainId, chains)}
      </p>
    </form>
  );
}

export default ScanForm;
