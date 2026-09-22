// One place that maps a risk level to its label and colours, shared by the
// scan result and the history list so the two can never disagree.
//
// Colours come only from the risk tokens in src/index.css. Azure is the
// RugRadar brand colour and never expresses risk; green / amber / red are
// reserved for security state.

const LEVEL_STYLES = {
  // Deliberately NOT green: "we found nothing" must never look like "it's safe".
  unknown: {
    badge: "bg-surface-elevated text-risk-unknown border-border-default",
    bar: "bg-risk-unknown",
    text: "text-risk-unknown",
    label: "Unknown - unverified",
  },
  low: {
    badge: "bg-risk-low/12 text-risk-low border-risk-low/35",
    bar: "bg-risk-low",
    text: "text-risk-low",
    label: "Low risk",
  },
  medium: {
    badge: "bg-risk-medium/12 text-risk-medium border-risk-medium/35",
    bar: "bg-risk-medium",
    text: "text-risk-medium",
    label: "Medium risk",
  },
  high: {
    badge: "bg-risk-high/12 text-risk-high border-risk-high/35",
    bar: "bg-risk-high",
    text: "text-risk-high",
    label: "High risk",
  },
};

// The score bands behind each level. Mirrors LEVEL_THRESHOLDS in
// ml-service/app/scorer.py (0-29 low, 30-59 medium, 60+ high) - change both
// together. Used to draw the scale a score sits on; the level itself always
// comes from the API.
export const LEVEL_BANDS = [
  { level: "low", from: 0, to: 30, fill: "bg-risk-low/20" },
  { level: "medium", from: 30, to: 60, fill: "bg-risk-medium/20" },
  { level: "high", from: 60, to: 100, fill: "bg-risk-high/20" },
];

// An unrecognised level falls back to "unknown", never to a coloured level:
// guessing at a risk we can't read is exactly the mistake this app avoids.
export function riskLevelStyle(level) {
  return LEVEL_STYLES[level] ?? LEVEL_STYLES.unknown;
}
