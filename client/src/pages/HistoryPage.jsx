// Every scan the backend has saved, newest first. Loads on arrival - so the
// address you just scanned is already here - and can be refreshed by hand.

import { useCallback, useEffect, useState } from "react";

import { fetchHistory } from "../api";
import HistoryList from "../components/HistoryList";

// The backend defaults to 20 and caps at 100.
const HISTORY_LIMIT = 20;

function HistoryPage() {
  const [scans, setScans] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setScans(await fetchHistory(HISTORY_LIMIT));
      setError(null);
    } catch (historyError) {
      setError(historyError.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleRefresh() {
    setIsLoading(true);
    await loadHistory();
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recent scans</h1>
          <p className="mt-2 text-slate-400">
            Every address scanned so far, newest first - tokens, wallets, Bitcoin and Litecoin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <div className="mt-8">
        <HistoryList scans={scans} isLoading={isLoading} error={error} onRetry={handleRefresh} />
      </div>
    </div>
  );
}

export default HistoryPage;
