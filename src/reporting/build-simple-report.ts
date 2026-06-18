import type { NormalizedDataset, SimpleGeneratedReport, SimpleReportSection } from "@/lib/domain";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";

function buildActivitySection(dataset: NormalizedDataset): SimpleReportSection {
  if (dataset.actionLogs.length === 0) {
    return {
      title: "Action log summary",
      bullets: [],
      emptyState: "Upload `action_logs.csv` or its Excel export to generate activity summaries.",
    };
  }

  const actionCounts = Object.entries(
    dataset.actionLogs.reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.action] = (accumulator[log.action] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  const latest = dataset.actionLogs
    .map((log) => log.created)
    .sort((left, right) => right.localeCompare(left))[0];

  return {
    title: "Action log summary",
    bullets: [
      `Processed ${formatNumber(dataset.actionLogs.length)} actions across ${formatNumber(new Set(dataset.actionLogs.map((log) => log.user_email)).size)} users.`,
      `Latest recorded action: ${formatDate(latest)}.`,
      ...actionCounts.map(([action, count]) => `${action}: ${formatNumber(count)} events`),
    ],
  };
}

function buildProjectSection(dataset: NormalizedDataset): SimpleReportSection {
  if (dataset.projectFeesByDepartment.length === 0) {
    return {
      title: "Project and fee summary",
      bullets: [],
      emptyState: "Upload `project_fees_by_department_by_month.csv` or its Excel equivalent to generate project and allocation summaries.",
    };
  }

  const departmentTotals = dataset.projectFeesByDepartment.reduce<Record<string, number>>((accumulator, row) => {
    for (const [department, value] of Object.entries(row.departmentFees)) {
      accumulator[department] = (accumulator[department] ?? 0) + value;
    }
    return accumulator;
  }, {});

  const topDepartments = Object.entries(departmentTotals)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  return {
    title: "Project and fee summary",
    bullets: [
      `Processed ${formatNumber(dataset.projectFeesByDepartment.length)} projects totaling ${formatCurrency(dataset.projectFeesByDepartment.reduce((sum, row) => sum + row.totalFees, 0))}.`,
      `Detected ${formatNumber(Object.keys(departmentTotals).length)} dynamic department allocation columns.`,
      ...topDepartments.map(([department, value]) => `${department}: ${formatCurrency(value)} allocated`),
    ],
  };
}

function buildDepartmentBreakdownSection(dataset: NormalizedDataset): SimpleReportSection {
  if (dataset.departmentBreakdown.length === 0) {
    return {
      title: "Department breakdown",
      bullets: [],
      emptyState: "Upload `department_breakdown_report.csv` or its Excel equivalent to generate department fee-share summaries.",
    };
  }

  const topDepartments = [...dataset.departmentBreakdown]
    .sort((left, right) => right.totalFees - left.totalFees)
    .slice(0, 5);

  return {
    title: "Department breakdown",
    bullets: topDepartments.map(
      (item) => `${item.department}: ${formatCurrency(item.totalFees)} (${formatPercent(item.percentOfTotal)})`,
    ),
  };
}

function buildClientSection(dataset: NormalizedDataset): SimpleReportSection {
  if (dataset.clientSummaries.length === 0) {
    return {
      title: "Client summary",
      bullets: [],
      emptyState: "Client summary is optional. Upload `client_summary_report.csv` or its Excel equivalent to include client-level totals.",
    };
  }

  const topClients = [...dataset.clientSummaries]
    .sort((left, right) => right.totalRevenue - left.totalRevenue)
    .slice(0, 5);

  return {
    title: "Client summary",
    bullets: topClients.map(
      (item) =>
        `${item.client}: ${formatNumber(item.totalProjects)} projects, ${formatCurrency(item.totalFees)} fees, ${formatCurrency(item.totalRevenue)} revenue`,
    ),
  };
}

export function buildSimpleReport(dataset: NormalizedDataset): SimpleGeneratedReport {
  return {
    title: "SaltHub export report preview",
    generatedAt: new Date().toISOString(),
    summaryCards: [
      {
        label: "Accepted uploads",
        value: formatNumber(dataset.uploads.filter((upload) => upload.status !== "unsupported" && upload.status !== "error").length),
      },
      {
        label: "Action events",
        value: formatNumber(dataset.actionLogs.length),
        detail: dataset.actionLogs.length > 0 ? "From action log exports" : "No action log uploaded",
      },
      {
        label: "Projects",
        value: formatNumber(dataset.projectFeesByDepartment.length),
        detail: dataset.projectFeesByDepartment.length > 0 ? formatCurrency(dataset.enterpriseRollup.totalFees) : "No project fees export uploaded",
      },
      {
        label: "Departments",
        value: formatNumber(dataset.departmentBreakdown.length),
        detail: dataset.departmentBreakdown.length > 0 ? "From department breakdown export" : "No department breakdown uploaded",
      },
    ],
    sections: [
      buildActivitySection(dataset),
      buildProjectSection(dataset),
      buildDepartmentBreakdownSection(dataset),
      buildClientSection(dataset),
    ],
    missingInputs: [
      dataset.actionLogs.length === 0 ? "action_logs" : "",
      dataset.projectFeesByDepartment.length === 0 ? "project_fees_by_department_by_month" : "",
      dataset.departmentBreakdown.length === 0 ? "department_breakdown_report" : "",
      dataset.clientSummaries.length === 0 ? "client_summary_report" : "",
    ].filter(Boolean),
  };
}
