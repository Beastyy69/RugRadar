// Everything the landing page SAYS lives here, so copy can change without
// touching layout or animation code.
//
// Rule for this file: every claim must be true of the code in ml-service/
// or of a real scan. No invented stats, users or testimonials. If a
// capability changes, change the sentence that describes it.

export const LINKS = {
  github: "https://github.com/Beastyy69/RugRadar",
  docs: "https://github.com/Beastyy69/RugRadar/blob/main/docs/RugRadar_Project_Documentation.pdf",
};

// ---------------------------------------------------------------------------
// Team - TODO: replace each placeholder with a real name and role.
// Initials for the avatar are derived from `name` automatically. `links`
// takes optional `github` / `linkedin` URLs; leave it empty until you have
// them and nothing is rendered.
// ---------------------------------------------------------------------------
export const TEAM = [
  { name: "Team Member", role: "Role", links: {} },
  { name: "Team Member", role: "Role", links: {} },
  { name: "Team Member", role: "Role", links: {} },
  { name: "Team Member", role: "Role", links: {} },
];

// Draft - awaiting approval.
export const MISSION =
  "Crypto scams move faster than anyone's due diligence. RugRadar closes that gap: one scan turns contract security flags, blocklists, community reports and on-chain history into a clear risk score and plain-English reasons, before you sign anything.";

// ---------------------------------------------------------------------------
// Hero example report.
//
// Real /scan output for LILPEPE (Ethereum), captured 2026-09-21 from the
// ml-service in this repo. It is in ml-service/tests as a known honeypot.
// Chosen because it is the whole argument for RugRadar in one card: it
// passes every surface check - verified source, zero tax, liquidity fully
// locked - and is still a honeypot you cannot sell.
// ---------------------------------------------------------------------------
export const EXAMPLE_REPORT = {
  name: "Little Pepe",
  symbol: "LILPEPE",
  chain: "Ethereum",
  address: "0xa37bb2aaac324eb974ea46729217040a23eae996",
  scannedOn: "Sep 2026",
  score: 65,
  level: "high",
  // In the order they animate: the clean checks first, the catch last.
  checks: [
    { label: "Verified source code", value: "Yes", status: "ok" },
    { label: "Buy / sell tax", value: "0% / 0%", status: "ok" },
    { label: "Liquidity locked", value: "100%", status: "ok" },
    { label: "Mintable supply", value: "No", status: "ok" },
    { label: "Hidden owner", value: "No", status: "ok" },
    { label: "Honeypot", value: "Yes", status: "risky" },
  ],
  // Verbatim from the scan's `reasons`.
  reason:
    "This token is flagged as a honeypot: you may be able to buy it but unable to sell it.",
};

// ---------------------------------------------------------------------------
// How it works
// ---------------------------------------------------------------------------
export const STEPS = [
  {
    icon: "paste",
    title: "Paste an address",
    body: "A token contract or a wallet, on EVM chains, Bitcoin or Litecoin. RugRadar recognises what it is and, for tokens, finds the chain it lives on.",
  },
  {
    icon: "search",
    title: "We cross-check the evidence",
    body: "Contract security checks, sanctions and community blocklists, scam reports from victims, and on-chain activity. No single source sees everything, so we ask several.",
  },
  {
    icon: "gauge",
    title: "Get a clear verdict",
    body: "A 0-100 risk score, a level, and the reasons in plain English. When the evidence isn't there, RugRadar says \"unknown\" instead of guessing \"safe\".",
  },
];

// ---------------------------------------------------------------------------
// What it detects - grouped from the rules in scorer.py, address_scorer.py,
// blocklist_client.py, chainabuse_client.py and utxo_scorer.py.
// ---------------------------------------------------------------------------
export const DETECTION_GROUPS = [
  {
    title: "Token contracts",
    items: [
      {
        icon: "trap",
        title: "Honeypots",
        body: "Tokens you can buy but can't sell. The flag that matters most, weighted so it alone lands in high risk.",
      },
      {
        icon: "key",
        title: "Owner control",
        body: "Hidden owners, owners who can change balances, and ownership that can be reclaimed after being \"renounced\".",
      },
      {
        icon: "coins",
        title: "Supply and trading traps",
        body: "Unlimited minting, pausable transfers, wallet blacklists and high buy or sell taxes.",
      },
      {
        icon: "droplet",
        title: "Liquidity and distribution",
        body: "Liquidity that isn't locked and can be pulled, and supply concentrated in a handful of wallets.",
      },
    ],
  },
  {
    title: "Wallets and addresses",
    items: [
      {
        icon: "user-x",
        title: "Known bad actors",
        body: "Addresses linked to phishing, theft, scams, cybercrime and money laundering in security data.",
      },
      {
        icon: "ban",
        title: "Sanctions and blocklists",
        body: "OFAC-sanctioned addresses, plus community lists: ScamSniffer and the MyEtherWallet darklist.",
      },
      {
        icon: "flag",
        title: "Community reports",
        body: "Scam reports filed by victims on Chainabuse, weighted by whether they have been verified.",
      },
      {
        icon: "bitcoin",
        title: "Bitcoin and Litecoin",
        body: "Sanctions and blocklist hits, plus modest behavioural signals that are always described as patterns, never as verdicts.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Coverage. Chain counts are from the live /chains endpoint (GoPlus) on
// 2026-09-21: 44 token-security chains including one testnet, hence "40+".
// Auto-detect chains are AUTO_DETECT_CHAINS in ml-service/app/chain_detect.py.
// ---------------------------------------------------------------------------
export const COVERAGE_STATS = [
  { value: "40+", label: "chains for token security checks" },
  { value: "5", label: "chains searched automatically for tokens" },
  { value: "2", label: "UTXO chains: Bitcoin and Litecoin" },
];

export const AUTO_DETECT_CHAINS = ["Ethereum", "BSC", "Polygon", "Base", "Arbitrum"];

export const DATA_SOURCES = [
  { name: "GoPlus Security", provides: "Token and address security flags" },
  { name: "Chainabuse", provides: "Scam reports filed by the community" },
  { name: "OFAC sanctions lists", provides: "Sanctioned addresses on Ethereum, Bitcoin and Litecoin" },
  { name: "ScamSniffer", provides: "Community scam-address database" },
  { name: "MyEtherWallet darklist", provides: "Known malicious addresses" },
  { name: "Blockscout and Etherscan", provides: "Transaction history and contract creation" },
  { name: "Public RPC nodes", provides: "Live balance and account type" },
  { name: "mempool.space and litecoinspace", provides: "Bitcoin and Litecoin activity" },
];
