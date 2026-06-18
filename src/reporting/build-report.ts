import type { AudienceOption, NormalizedDataset, ReportSection, ReportViewModel } from "@/lib/domain";
import { buildComparisonRows, deriveAudienceScore } from "@/derivation/metrics";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";

function findManagerNotes(dataset: NormalizedDataset, subjectId?: string) {
  return subjectId ? (dataset.frictionRollups.byManagerId[subjectId] ?? []) : [];
}

function findLeaderNotes(dataset: NormalizedDataset, subjectId?: string) {
  return subjectId ? (dataset.frictionRollups.byLeaderId[subjectId] ?? []) : [];
}

function findDepartmentNotes(dataset: NormalizedDataset, department?: string) {
  return department ? (dataset.frictionRollups.byDepartment[department] ?? []) : [];
}

function buildThemeBullets(prefix: string, noteCount: number, managerCount: number, teamCount: number) {
  return [
    `${prefix} appeared in ${noteCount} note${noteCount === 1 ? "" : "s"}.`,
    `Mentioned by ${managerCount} distinct manager${managerCount === 1 ? "" : "s"}.`,
    teamCount > 1 ? `Observed across ${teamCount} teams.` : "Concentrated within one team scope.",
  ];
}

function buildSections(dataset: NormalizedDataset, option: AudienceOption, subjectLabel: string): ReportSection[] {
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
    const notes = findManagerNotes(dataset, option.subjectId).sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
    const latest = notes[0];

    sections.push(
      latest
        ? {
            title: "Weekly friction note",
            body: latest.noteText,
            availability: "available",
            tone: "quote",
            callout: `Submitted for ${latest.reportingPeriodStart} to ${latest.reportingPeriodEnd}`,
          }
        : {
            title: "Weekly friction note",
            body: "No note submitted this week.",
            availability: "placeholder",
          },
    );
  }

  if (option.audience === "leader") {
    const notes = findLeaderNotes(dataset, option.subjectId);
    const topTheme = notes.length > 0 ? dataset.frictionRollups.enterpriseThemes.find((theme) =>
      notes.some((note) => theme.sampleManagerNames.includes(note.managerName) || theme.evidenceSnippets.includes(note.noteText)),
    ) ?? null : null;

    if (topTheme) {
      const totalManagers = new Set(notes.map((note) => note.managerId)).size;
      sections.push({
        title: "Top friction theme",
        body: `${topTheme.label} was the strongest repeated signal across ${subjectLabel}.`,
        availability: "available",
        tone: "summary",
        callout: `Mentioned by ${topTheme.distinctManagerCount} of ${totalManagers} managers.`,
        bullets: buildThemeBullets(topTheme.label, topTheme.noteCount, topTheme.distinctManagerCount, topTheme.distinctTeamCount),
      });
    }
  }

  if (option.audience === "departmentLead") {
    const notes = findDepartmentNotes(dataset, subjectLabel);
    const departmentThemes = notes.length > 0
      ? dataset.frictionRollups.enterpriseThemes.filter((theme) =>
          notes.some((note) => theme.evidenceSnippets.includes(note.noteText)),
        ).slice(0, 3)
      : [];

    for (const theme of departmentThemes) {
      sections.push({
        title: theme.label,
        body: theme.summary,
        availability: "available",
        tone: "summary",
        classification: theme.classification,
        bullets: buildThemeBullets(theme.label, theme.noteCount, theme.distinctManagerCount, theme.distinctTeamCount),
      });
    }
  }

  if (option.audience === "elt") {
    const topThemes = dataset.frictionRollups.enterpriseThemes.slice(0, 3);

    if (topThemes.length > 0) {
      sections.push({
        title: "Top bottlenecks this month",
        body: "Enterprise friction is summarized from repeated manager feedback only.",
        availability: "available",
        tone: "summary",
        bullets: topThemes.map(
          (theme) =>
            `${theme.label}: ${theme.noteCount} notes, ${theme.distinctManagerCount} managers, ${theme.classification ?? "Unclassified"}.`,
        ),
      });

      const strongThemes = topThemes.filter((theme) => theme.distinctManagerCount >= 2 && theme.distinctTeamCount >= 2);
      sections.push(
        strongThemes.length > 0
          ? {
              title: "Decisions and asks",
              body: "Only themes with repeated cross-team evidence are elevated into action asks.",
              availability: "available",
              tone: "summary",
              bullets: strongThemes.map(
                (theme) =>
                  `Evaluate an action on ${theme.label.toLowerCase()} because it recurs across ${theme.distinctManagerCount} managers and ${theme.distinctTeamCount} teams.`,
              ),
            }
          : {
              title: "Decisions and asks",
              body: "Evidence is not yet strong enough to promote a cross-enterprise ask.",
              availability: "placeholder",
            },
      );
    }
  }

  if (
    (option.audience === "leader" || option.audience === "departmentLead" || option.audience === "elt") &&
    dataset.frictionNotes.length === 0
  ) {
    sections.push({
      title: "Friction themes",
      body: "No friction-note source has been uploaded yet.",
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
  const subjectLabel =
    option.audience === "elt"
      ? "Enterprise leadership team"
      : option.audience === "departmentLead"
        ? department?.department ?? "Department"
        : user?.name ?? option.label;

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
    subtitle: "Phase 2 preview built from uploaded SaltHub exports, structured payloads, and friction-note rollups.",
    subjectLabel,
    generatedAt: new Date().toISOString(),
    score,
    metrics,
    comparisons: buildComparisonRows(dataset, option.audience),
    sections: buildSections(dataset, option, subjectLabel),
    notes:
      dataset.missingSources.length > 0
        ? [`Missing inputs: ${dataset.missingSources.join(", ")}`]
        : ["All primary Phase 1 sources required for this preview are present."],
    printHint: "Use browser print for a clean single-column brief layout.",
  };
}
