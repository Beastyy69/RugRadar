// Scanner view: enter any address on any supported chain, see its risk score.
//
// Layout: header -> input -> scan trace (progress, then its record) -> report.
// The page is a wide workspace (max-w-6xl) so the report can use columns;
// the input and the scan trace read best at a narrower measure.
//
// A scan moves through: scanning -> done | error | cancelled. It can be
// cancelled, and it is abandoned after SCAN_TIMEOUT_MS so an unreachable
// upstream (e.g. a Bitcoin block explorer) can't leave a spinner forever.

import { useEffect, useRef, useState } from "react";

import { fetchChains, scanToken } from "../api";
import Reveal from "../components/landing/Reveal";
import SectionHeading from "../components/landing/SectionHeading";
import ScanForm from "../components/ScanForm";
import ScanReport from "../components/report/ScanReport";
import ScanTrace from "../components/ScanTrace";
import { ADDRESS_KINDS, detectAddressKind } from "../lib/addressFormat";
import { chainName, checksFor, resolveChecks } from "../lib/scanChecks";

const SCAN_TIMEOUT_MS = 60_000;

const TIMEOUT_MESSAGE =
  "The scan took longer than 60 seconds, so RugRadar stopped waiting. One of its data sources may be slow or unreachable - please try again in a moment.";

// What a screen reader hears when the scan changes state. The ticking timer
// is deliberately NOT announced.
const ANNOUNCEMENTS = {
  scanning: "Scan started.",
  done: "Scan complete.",
  error: "The scan could not be completed.",
  cancelled: "Scan cancelled.",
};

function networkLabelFor(request, chains) {
  if (request.kind === "btc" || request.kind === "ltc") return ADDRESS_KINDS[request.kind].network;
  return request.chainId === "auto" ? "Auto-detect" : chainName(request.chainId, chains);
}

function ScannerPage() {
  const [chains, setChains] = useState([]);
  // { status: "idle" } or { status, request, result?, durationMs?, message? }
  const [scan, setScan] = useState({ status: "idle" });
  const controllerRef = useRef(null);

  // Load the chain list once. If it fails the form still works - it just
  // offers auto-detect only - rather than blocking the whole page.
  useEffect(() => {
    fetchChains()
      .then((data) => {
        const addressScanIds = new Set(data.address_security.map((chain) => chain.id));
        setChains(
          data.token_security.map((chain) => ({
            ...chain,
            supportsAddressScan: addressScanIds.has(chain.id),
          }))
        );
      })
      .catch(() => setChains([]));
  }, []);

  // Leaving the page mid-scan abandons the request.
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function handleScan(address, chainId) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, SCAN_TIMEOUT_MS);

    const request = { address, chainId, kind: detectAddressKind(address), startedAt: Date.now() };
    setScan({ status: "scanning", request });

    try {
      const result = await scanToken(address, chainId, { signal: controller.signal });
      setScan({ status: "done", request, result, durationMs: Date.now() - request.startedAt });
    } catch (scanError) {
      if (scanError.name === "AbortError") {
        // Superseded by a newer scan: that scan owns the UI now.
        if (controllerRef.current !== controller) return;
        setScan(
          timedOut
            ? { status: "error", request, message: TIMEOUT_MESSAGE }
            : { status: "cancelled", request },
        );
      } else {
        setScan({ status: "error", request, message: scanError.message });
      }
    } finally {
      clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  function handleCancel() {
    controllerRef.current?.abort();
  }

  const { status, request, result } = scan;
  const checkContext = request && { chainId: request.chainId, chains };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <SectionHeading
        level={1}
        id="scanner-title"
        eyebrow="Security scanner"
        title="Analyze a token or wallet before you interact with it."
      >
        Paste an address and RugRadar will cross-check the available security signals and return
        an explainable result.
      </SectionHeading>

      {/* The panel arrives just after the header, the same entrance as the
          landing page's sections. */}
      <Reveal as="section" delay={0.1} className="mt-10 max-w-3xl">
        <h2 className="sr-only">Scan an address</h2>
        <ScanForm onScan={handleScan} isLoading={status === "scanning"} chains={chains} />
      </Reveal>

      <p className="sr-only" aria-live="polite">
        {ANNOUNCEMENTS[status] ?? ""}
      </p>

      <div className="mt-6 max-w-3xl space-y-6">
        {(status === "scanning" || status === "done") && (
          <ScanTrace
            // A fresh panel per scan; the same panel from progress to record.
            key={request.startedAt}
            checks={checksFor(request.kind, checkContext)}
            outcomes={status === "done" ? resolveChecks(result, checkContext) : null}
            address={request.address}
            networkLabel={networkLabelFor(request, chains)}
            startedAt={request.startedAt}
            durationMs={scan.durationMs}
            onCancel={handleCancel}
          />
        )}

        {status === "cancelled" && (
          <p className="rounded-xl border border-border-default bg-surface-primary/80 p-4 text-sm text-text-secondary">
            Scan cancelled. If the server was already partway through, it may still finish in the
            background and appear in History.
          </p>
        )}

        {/* Error presentation is redesigned in a later phase. */}
        {status === "error" && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            {scan.message}
          </p>
        )}
      </div>

      {status === "done" && (
        <section aria-label="Security report" className="mt-8">
          <ScanReport result={result} request={request} chains={chains} />
        </section>
      )}
    </div>
  );
}

export default ScannerPage;
