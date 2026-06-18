import type { AudienceOption, NormalizedDataset, ReportSection, ReportViewModel } from "@/lib/domain";
import { buildComparisonRows, deriveAudienceScore } from "@/derivation/metrics";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

function buildSections(dataset: NormalizedDataset, option: AudienceOption): ReportSection[] {
  const sections: ReportSection[] = [
    {
      title: "Performance snapshot",
      body:
        dataset.enterpriseRollup.totalActions > 0
          ? "Activity and workflow indicators are grounded in uploaded exports and normalized into deterministic score bands."
          : "Upload action logs or analytics payloads to unlock performance commentary.",
      availability: dataset.enterpriseRollup.totalActions > 0 ? "available" : "placeholder",
    },
    {
      title: "Narrative summary",
      body:
        "Phase 1 provides templated narrative blocks derived from the available structured metrics. A future content layer can replace or augment this text without changing the report model.",
      availability: "available",
    },
  ];

  if (option.audience === "manager") {
    sections.push({
      title: "Friction notes",
      body: "No friction-note source has been uploaded yet. This section remains intentionally empty in Phase 1.",
      availability: "placeholder",
    });
  }

  if (option.audience === "leader" || option.audience === "departmentLead" || option.audience === "elt") {
    sections.push({
      title: "Friction themes",
      body: "Hidden until friction-note data exists in a later phase.",
      availability: "hidden",
    });
  }

  return sections;
}

export function buildReportViewModel(dataset: NormalizedDataset, option: AudienceOption): ReportViewModel {
  const user = dataset.userDirectory.find((item) => item.id === option.subjectId);
  const department = dataset.departmentRollups.find((item) => item.id === option.subjectId);
  const metric = dataset.individualMetrics.find((item) => item.subjectId === option.subjectId);
  const score = deriveAudienceScore(dataset, option.audience, option.subjectId);

  const metrics =
    option.audience === "elt"
      ? [
          { label: "Total fees", value: formatCurrency(dataset.enterpriseRollup.totalFees) },
          { label: "Project count", value: formatNumber(dataset.enterpriseRollup.totalProjects) },
          { label: "Action volume", value: formatNumber(dataset.enterpriseRollup.totalActions) },
        ]
      : option.audience === "departmentLead"
        ? [
            { label: "Department", value: department?.department ?? "Not found" },
            { label: "Fee total", value: formatCurrency(department?.totalFees ?? 0) },
            {
              label: "Share of total",
              value:
                department?.percentOfTotal !== undefined ? `${department.percentOfTotal.toFixed(1)}%` : "Not available",
            },
          ]
        : [
            { label: "Subject", value: user?.name ?? "Unknown subject" },
            { label: "Activity count", value: formatNumber(metric?.activityCount ?? 0) },
            { label: "Last activity", value: formatDate(metric?.lastActivityAt) },
          ];

  return {
    audience: option.audience,
    title: `Salthub ${option.audience === "elt" ? "Executive" : "Audience"} Report Card`,
    subtitle: "Phase 1 preview built from uploaded SaltHub exports and structured payloads.",
    subjectLabel:
      option.audience === "elt"
        ? "Enterprise leadership team"
        : option.audience === "departmentLead"
          ? department?.department ?? "Department"
          : user?.name ?? option.label,
    generatedAt: new Date().toISOString(),
    score,
    metrics,
    comparisons: buildComparisonRows(dataset, option.audience),
    sections: buildSections(dataset, option),
    notes:
      dataset.missingSources.length > 0
        ? [`Missing inputs: ${dataset.missingSources.join(", ")}`]
        : ["All primary Phase 1 sources required for this preview are present."],
    printHint: "Use browser print for a clean single-column brief layout.",
  };
}
