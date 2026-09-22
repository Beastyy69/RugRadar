// Chainabuse community reports: victims and investigators reporting
// addresses they were scammed through. Only shown when the check actually
// ran - when it didn't, the scan's own record says why.
//
// "Verified" describes the REPORT's credibility, not the address's safety,
// so it is brand-coloured, never green.

import { formatAbsoluteTime } from "../../lib/format";
import InfoPanel from "./InfoPanel";

const CATEGORY_LABELS = {
  PHISHING: "Phishing",
  RUG_PULL: "Rug pull",
  FAKE_PROJECT: "Fake project",
  PIGBUTCHERING: "Pig butchering",
  RANSOMWARE: "Ransomware",
  SEXTORTION: "Sextortion",
  SIM_SWAP: "SIM swap",
  ROMANCE: "Romance scam",
  IMPERSONATION: "Impersonation",
  FAKE_RETURNS: "Fake returns",
  AIRDROP: "Fake airdrop",
  CONTRACT_EXPLOIT: "Contract exploit",
};

function categoryLabel(category) {
  if (!category) return "Scam";
  return CATEGORY_LABELS[category] ?? category.replaceAll("_", " ").toLowerCase();
}

function CommunityPanel({ community }) {
  const reports = community.reports ?? [];

  return (
    <InfoPanel eyebrow="Community" title="Community scam reports">
      <p className="mt-1 text-xs text-text-tertiary">via Chainabuse{community.cached ? " (cached)" : ""}</p>

      {reports.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">No scam reports have been filed against this address.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reports.slice(0, 5).map((report) => {
            const verified = report.checked || report.trusted;
            return (
              <li key={report.id} className="rounded-lg border border-border-subtle bg-bg-secondary p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-risk-high/12 px-2 py-0.5 text-xs font-medium text-risk-high">
                    {categoryLabel(report.category)}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      verified ? "bg-brand-muted text-brand-secondary" : "bg-surface-elevated text-text-tertiary"
                    }`}
                  >
                    {verified ? "Verified report" : "Unverified report"}
                  </span>
                  {report.created_at && (
                    <span className="text-xs text-text-tertiary">{formatAbsoluteTime(report.created_at)}</span>
                  )}
                </div>
                {report.description && (
                  <p className="mt-2 line-clamp-3 leading-relaxed text-text-secondary">{report.description}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {reports.length > 5 && <p className="mt-3 text-xs text-text-tertiary">+ {reports.length - 5} more reports</p>}
    </InfoPanel>
  );
}

export default CommunityPanel;
