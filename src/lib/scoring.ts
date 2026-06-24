import type { ReportScopeEntry } from "@/lib/domain";

export interface ScoreMetrics {
  loginCount: number;
  pipelineEntriesCreated: number;
  estimatesCreated: number;
  estimatesSubmitted: number;
  sentForBusinessOwnerApproval: number;
  firstApprovals: number;
  approvalsCompleted: number;
  clientApprovals: number;
  projectsConfirmed: number;
  reworkEvents: number;
}

export interface ScoreStatus {
  color: "green" | "yellow" | "red" | null;
  label: string | null;
}

interface BusinessOwnerScoreInput {
  eligibleChildCount: number;
  activeChildMetrics: ScoreMetrics[];
  aggregateMetrics: ScoreMetrics;
}

interface SuperAdminScoreInput {
  eligibleBusinessOwnerCount: number;
  activeBusinessOwnerCount: number;
  businessOwnerScores: number[];
  aggregateMetrics: ScoreMetrics;
}

function cap(value: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.min(value / target, 1);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(Math.round(value), 100));
}

export function hasMeaningfulActivity(metrics: ScoreMetrics) {
  return (
    metrics.loginCount > 0 ||
    metrics.estimatesCreated > 0 ||
    metrics.pipelineEntriesCreated > 0 ||
    metrics.estimatesSubmitted > 0 ||
    metrics.sentForBusinessOwnerApproval > 0 ||
    metrics.firstApprovals > 0 ||
    metrics.approvalsCompleted > 0 ||
    metrics.clientApprovals > 0 ||
    metrics.projectsConfirmed > 0 ||
    metrics.reworkEvents > 0
  );
}

function calculateQualityScore(metrics: ScoreMetrics) {
  const completedWork = metrics.estimatesSubmitted + metrics.projectsConfirmed;

  if (completedWork <= 0) {
    return 1;
  }

  return Math.max(0, 1 - Math.min(metrics.reworkEvents / Math.max(completedWork, 1), 1));
}

function calculateThroughput(metrics: ScoreMetrics) {
  return metrics.estimatesCreated + metrics.estimatesSubmitted + metrics.pipelineEntriesCreated + metrics.projectsConfirmed;
}

function calculateReworkRate(metrics: ScoreMetrics) {
  const completedWork = metrics.estimatesSubmitted + metrics.projectsConfirmed;
  return completedWork <= 0 ? 0 : metrics.reworkEvents / completedWork;
}

export function calculateTeamMemberScore(metrics: ScoreMetrics) {
  if (!hasMeaningfulActivity(metrics)) {
    return 0;
  }

  const adoptionScore = cap(metrics.loginCount, 4);
  const creationScore = 0.55 * cap(metrics.estimatesCreated, 3) + 0.45 * cap(metrics.pipelineEntriesCreated, 4);
  const deliveryScore =
    0.45 * cap(metrics.estimatesSubmitted, 2) +
    0.2 * cap(metrics.sentForBusinessOwnerApproval, 1) +
    0.35 * cap(metrics.projectsConfirmed, 1);
  const approvalScore =
    0.4 * cap(metrics.firstApprovals, 2) +
    0.35 * cap(metrics.approvalsCompleted, 2) +
    0.25 * cap(metrics.clientApprovals, 1);
  const qualityScore = calculateQualityScore(metrics);

  return clampScore(
    100 *
      (0.2 * adoptionScore + 0.25 * creationScore + 0.3 * deliveryScore + 0.15 * approvalScore + 0.1 * qualityScore),
  );
}

export function calculateBusinessOwnerScore(input: BusinessOwnerScoreInput) {
  if (input.eligibleChildCount <= 0) {
    return 0;
  }

  const activeChildCount = input.activeChildMetrics.filter(hasMeaningfulActivity).length;
  const averageChildScore =
    activeChildCount > 0
      ? input.activeChildMetrics.filter(hasMeaningfulActivity).reduce((sum, metrics) => sum + calculateTeamMemberScore(metrics), 0) /
        activeChildCount
      : 0;
  const activeCoverage = activeChildCount / input.eligibleChildCount;
  const teamThroughputScore =
    0.4 * cap(input.aggregateMetrics.estimatesCreated, Math.max(input.eligibleChildCount * 2, 1)) +
    0.35 * cap(input.aggregateMetrics.estimatesSubmitted, Math.max(input.eligibleChildCount * 1.5, 1)) +
    0.25 * cap(input.aggregateMetrics.projectsConfirmed, Math.max(input.eligibleChildCount * 0.75, 1));
  const teamQualityScore = calculateQualityScore(input.aggregateMetrics);

  return clampScore(
    100 * (0.5 * (averageChildScore / 100) + 0.25 * activeCoverage + 0.15 * teamThroughputScore + 0.1 * teamQualityScore),
  );
}

export function calculateSuperAdminScore(input: SuperAdminScoreInput) {
  if (input.eligibleBusinessOwnerCount <= 0) {
    return 0;
  }

  const activeCoverage = input.activeBusinessOwnerCount / input.eligibleBusinessOwnerCount;
  const averageBusinessOwnerScore =
    input.businessOwnerScores.length > 0
      ? input.businessOwnerScores.reduce((sum, score) => sum + score, 0) / input.businessOwnerScores.length
      : 0;
  const leaderThroughputScore =
    0.5 * cap(input.aggregateMetrics.estimatesCreated, Math.max(input.activeBusinessOwnerCount * 4, 1)) +
    0.3 * cap(input.aggregateMetrics.estimatesSubmitted, Math.max(input.activeBusinessOwnerCount * 3, 1)) +
    0.2 * cap(input.aggregateMetrics.projectsConfirmed, Math.max(input.activeBusinessOwnerCount * 2, 1));
  const leaderQualityScore = calculateQualityScore(input.aggregateMetrics);

  return clampScore(
    100 *
      (0.6 * (averageBusinessOwnerScore / 100) +
        0.2 * activeCoverage +
        0.1 * leaderThroughputScore +
        0.1 * leaderQualityScore),
  );
}

export function getScoreStatus(metrics: ScoreMetrics, score: number | null, priorPeriodScore: number | null): ScoreStatus {
  if (score === null) {
    return {
      color: null,
      label: null,
    };
  }

  const color = score >= 80 ? "green" : score >= 60 ? "yellow" : "red";
  const throughput = calculateThroughput(metrics);
  const reworkRate = calculateReworkRate(metrics);

  if (priorPeriodScore === null) {
    return {
      color,
      label: color === "green" ? "Consistent" : color === "yellow" ? "Holding" : "Needs attention",
    };
  }

  const delta = score - priorPeriodScore;

  if (color === "green") {
    if (delta >= 8) {
      return { color, label: "Trending up" };
    }

    if (delta >= 3) {
      return { color, label: "Improving" };
    }

    if (reworkRate <= 0.15) {
      return { color, label: "Reliable" };
    }

    return { color, label: "Consistent" };
  }

  if (color === "yellow") {
    if (throughput <= 2) {
      return { color, label: "Forming" };
    }

    if (delta <= -8) {
      return { color, label: "Stalling" };
    }

    if (reworkRate > 0.25) {
      return { color, label: "Mixed" };
    }

    return { color, label: "Holding" };
  }

  if (throughput <= 1 && metrics.loginCount <= 1) {
    return { color, label: "Stuck" };
  }

  if (delta <= -10) {
    return { color, label: "Off-track" };
  }

  return { color, label: "Needs attention" };
}

export function getScopeEntryStatusText(entry: Pick<ReportScopeEntry, "score" | "status">) {
  if (entry.score === null || !entry.status.color) {
    return "N/A";
  }

  return `${entry.status.color.charAt(0).toUpperCase()}${entry.status.color.slice(1)}`;
}
