import type { ComparisonRow, NormalizedDataset, ReportAudience } from "@/lib/domain";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { getScoreBand } from "@/lib/score";

export function buildComparisonRows(dataset: NormalizedDataset, audience: ReportAudience): ComparisonRow[] {
  if (audience === "elt" || audience === "departmentLead") {
    return dataset.departmentRollups.slice(0, 5).map((item) => ({
      label: item.department,
      value: formatCurrency(item.totalFees),
      context: item.percentOfTotal !== undefined ? formatPercent(item.percentOfTotal) : undefined,
    }));
  }

  return [
    {
      label: "Total actions",
      value: formatNumber(dataset.enterpriseRollup.totalActions),
      context: "Across uploaded action logs",
    },
    {
      label: "Projects in batch",
      value: formatNumber(dataset.enterpriseRollup.totalProjects),
      context: "Across uploaded project exports",
    },
    {
      label: "Known users",
      value: formatNumber(dataset.userDirectory.length),
      context: "From directory and analytics feeds",
    },
  ];
}

export function deriveAudienceScore(dataset: NormalizedDataset, audience: ReportAudience, subjectId?: string) {
  if (audience === "elt") {
    const actionScore = Math.min(100, dataset.enterpriseRollup.totalActions / 3);
    const feeScore = Math.min(100, dataset.enterpriseRollup.totalFees / 10000);
    return getScoreBand((actionScore + feeScore) / 2);
  }

  if (audience === "departmentLead") {
    const department = dataset.departmentRollups.find((item) => item.id === subjectId);
    return getScoreBand(department ? Math.min(100, department.percentOfTotal ?? department.totalFees / 1000) : 0);
  }

  const metric = dataset.individualMetrics.find((item) => item.subjectId === subjectId);
  const activityScore = Math.min(100, (metric?.activityCount ?? 0) * 8);
  const workflowScore = metric?.workflowScore ?? 68;
  return getScoreBand((activityScore + workflowScore) / 2);
}
