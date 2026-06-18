import type { ScoreBand } from "@/lib/domain";

const GREEN_LABELS = ["Consistent", "Trending up", "Improving", "Reliable"] as const;
const YELLOW_LABELS = ["Forming", "Mixed", "Stalling", "Holding"] as const;
const RED_LABELS = ["Stuck", "Off-track", "Needs attention"] as const;

function pickLabel(score: number) {
  if (score >= 80) {
    return GREEN_LABELS[score % GREEN_LABELS.length];
  }

  if (score >= 60) {
    return YELLOW_LABELS[score % YELLOW_LABELS.length];
  }

  return RED_LABELS[score % RED_LABELS.length];
}

export function getScoreBand(rawScore: number): ScoreBand {
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (score >= 80) {
    return { score, band: "green", label: pickLabel(score) };
  }

  if (score >= 60) {
    return { score, band: "yellow", label: pickLabel(score) };
  }

  return { score, band: "red", label: pickLabel(score) };
}
