// The security report for one scan: verdict first, then why, then the
// facts behind it. Sections arrive in a short stagger, so the report reads
// as being assembled rather than swapped in.
//
// Layout: the verdict spans the page; findings take the wide column with
// the address/token facts beside them; activity and community reports
// follow. Everything collapses to one column on small screens.

import { m } from "framer-motion";

import { splitFindings } from "../../lib/findings";
import { DURATION, EASE, REVEAL_OFFSET } from "../../lib/motion";
import ActivityPanel from "./ActivityPanel";
import CommunityPanel from "./CommunityPanel";
import ContractPanel from "./ContractPanel";
import FindingsSection from "./FindingsSection";
import RiskOverview from "./RiskOverview";
import TokenPanel from "./TokenPanel";
import UtxoPanel from "./UtxoPanel";

const reportVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: REVEAL_OFFSET },
  visible: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE.enter } },
};

function ScanReport({ result, request, chains }) {
  const { risks, notes } = splitFindings(result);
  const isUtxo = result.address_type === "utxo_address";
  const community = result.community_reports?.checked ? result.community_reports : null;
  // Bitcoin/Litecoin have no indexer-style history; their activity profile
  // is shown in the UTXO panel instead.
  const activity = !isUtxo && result.activity ? result.activity : null;

  return (
    <m.div variants={reportVariants} initial="hidden" animate="visible" className="space-y-6">
      <m.div variants={sectionVariants}>
        <RiskOverview result={result} request={request} chains={chains} riskCount={risks.length} />
      </m.div>

      <div className="grid gap-6 lg:grid-cols-12">
        <m.div variants={sectionVariants} className="lg:col-span-7">
          <FindingsSection risks={risks} notes={notes} />
        </m.div>

        <m.div variants={sectionVariants} className="space-y-6 lg:col-span-5">
          {isUtxo ? (
            <UtxoPanel profile={result.features ?? {}} />
          ) : (
            <>
              <ContractPanel result={result} chains={chains} />
              {result.details && <TokenPanel details={result.details} />}
            </>
          )}
        </m.div>
      </div>

      {(activity || community) && (
        <m.div variants={sectionVariants} className="grid gap-6 lg:grid-cols-2">
          {activity && (
            <div className={community ? "" : "lg:col-span-2"}>
              <ActivityPanel activity={activity} />
            </div>
          )}
          {community && (
            <div className={activity ? "" : "lg:col-span-2"}>
              <CommunityPanel community={community} />
            </div>
          )}
        </m.div>
      )}
    </m.div>
  );
}

export default ScanReport;
