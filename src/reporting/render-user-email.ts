import type { NormalizedUserReport, ReportScopeEntry } from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import { getScopeEntryStatusText } from "@/lib/scoring";

const HIDDEN_REPORT_CARD_MISSING_FIELDS = new Set(["activeDaysCount", "lastActivityTs"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMultilineText(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function getVisibleMissingFields(report: Pick<NormalizedUserReport, "missingFields">) {
  return report.missingFields.filter((field) => !HIDDEN_REPORT_CARD_MISSING_FIELDS.has(field));
}

function humanizeRole(role: string | null) {
  if (!role) {
    return "N/A";
  }

  return role
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function humanizeTeam(department: string | null) {
  return department ?? "N/A";
}

function isIndividualUserReportRole(role: NormalizedUserReport["role"]) {
  return (
    role === "team_member" ||
    role === "project_lead" ||
    role === "freelancer" ||
    role === "contributor" ||
    role === "department_owner"
  );
}

function formatWeekLabel(startDate: string) {
  const parsed = new Date(startDate);

  if (Number.isNaN(parsed.getTime())) {
    return `WEEK OF ${startDate.toUpperCase()}`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  })
    .format(parsed)
    .toUpperCase()
    .replace(",", "");
}

function formatPeriodEndingLabel(endDate: string) {
  const parsed = new Date(endDate);

  if (Number.isNaN(parsed.getTime())) {
    return `TWO WEEKS ENDING ${endDate.toUpperCase()}`;
  }

  return `TWO WEEKS ENDING ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  })
    .format(parsed)
    .toUpperCase()
    .replace(",", "")}`;
}

function formatLastActiveValue(lastActivityTs: string | null) {
  if (!lastActivityTs) {
    return "N/A";
  }

  const parsed = new Date(lastActivityTs);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parsed);
}

function formatLastActiveDetail(lastActivityTs: string | null) {
  if (!lastActivityTs) {
    return "not configured yet";
  }

  const parsed = new Date(lastActivityTs);

  if (Number.isNaN(parsed.getTime())) {
    return "not configured yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function getStatusVariant(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (!report.status.color || !report.status.label) {
    return {
      text: "N/A",
      background: "#F5F5F4",
      color: "#6B7280",
    };
  }

  if (report.status.color === "green") {
    return {
      text: `${report.status.color.toUpperCase()} - ${report.status.label.toUpperCase()}`,
      background: "#F0F9F8",
      color: "#00807E",
    };
  }

  if (report.status.color === "yellow") {
    return {
      text: `${report.status.color.toUpperCase()} - ${report.status.label.toUpperCase()}`,
      background: "#FDF3E5",
      color: "#C2710F",
    };
  }

  return {
    text: `${report.status.color.toUpperCase()} - ${report.status.label.toUpperCase()}`,
    background: "#FCEDF3",
    color: "#C0245F",
  };
}

function buildLede(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.lede.trim().length > 0) {
    return report.content.lede;
  }

  return `This week showed ${formatNumber(report.metrics.loginCount)} logins, ${formatNumber(
    report.metrics.pipelineEntriesCreated,
  )} pipeline entr${report.metrics.pipelineEntriesCreated === 1 ? "y" : "ies"}, ${formatNumber(
    report.metrics.estimatesSubmitted,
  )} estimate${report.metrics.estimatesSubmitted === 1 ? "" : "s"} submitted, ${formatNumber(
    report.metrics.projectsConfirmed,
  )} project${report.metrics.projectsConfirmed === 1 ? "" : "s"} confirmed, and ${formatNumber(
    report.metrics.reworkEvents,
  )} rework event${report.metrics.reworkEvents === 1 ? "" : "s"}.`;
}

function buildObservation(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.scopeSummary?.emptyStateMessage) {
    return report.scopeSummary.emptyStateMessage;
  }

  if (report.content.observation.trim().length > 0) {
    return report.content.observation;
  }

  if (report.metrics.reworkEvents === 0) {
    return "Sample observation text. Your current preview shows a clean workflow week with no recorded rework. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
  }

  return "Sample observation text. Your current preview shows completed activity across the week, with some follow-up still visible in the rework count. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
}

function buildManagerLede(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.lede.trim().length > 0) {
    return report.content.lede;
  }

  if (report.scopeSummary?.emptyStateMessage) {
    return report.scopeSummary.emptyStateMessage;
  }

  return `This preview shows ${formatNumber(report.metrics.pipelineEntriesCreated)} pipeline entr${
    report.metrics.pipelineEntriesCreated === 1 ? "y" : "ies"
  }, ${formatNumber(report.metrics.estimatesSubmitted)} estimate${
    report.metrics.estimatesSubmitted === 1 ? "" : "s"
  } submitted, ${formatNumber(report.metrics.approvalsCompleted)} approval${
    report.metrics.approvalsCompleted === 1 ? "" : "s"
  } completed, and ${formatNumber(report.metrics.reworkEvents)} rework event${
    report.metrics.reworkEvents === 1 ? "" : "s"
  }. Team-level scoring and broader adoption rollups are still being configured.`;
}

function buildManagerWhatStandsOut(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.whatStandsOut.trim().length > 0) {
    return report.content.whatStandsOut;
  }

  if (report.scopeSummary?.emptyStateMessage) {
      return `${report.scopeSummary.emptyStateMessage} This business-owner preview is being kept as an empty-state shell until Account Management user activity appears in the selected period.`;
  }

  if (report.scopeSummary) {
    return `Temporary sample insight: ${formatNumber(report.scopeSummary.activeChildCount)} of ${formatNumber(
      report.scopeSummary.eligibleChildCount,
    )} eligible Account Management user${
      report.scopeSummary.eligibleChildCount === 1 ? "" : "s"
    } showed activity in this period. Detailed coaching logic will be configured later.`;
  }

  return "Temporary sample insight: activity is visible in the current SaltHub export, but the full business-owner rollup logic is not configured yet. Use this section as a content placeholder while we wire the OpenAI-generated diagnostic summary on top of the real aggregated metrics.";
}

function buildManagerActions(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.worthDoingThisWeek.length >= 3) {
    return report.content.worthDoingThisWeek.slice(0, 3);
  }

  if (report.scopeSummary?.emptyStateMessage) {
    return [
      "No eligible active Account Management users were found for this period. Keep this report as an empty-state preview until team activity is available.",
      "Use the selected date range to confirm whether activity is genuinely absent or simply outside the current reporting window.",
      "This placeholder recommendation will later be replaced with grounded coaching text once AI generation is enabled.",
    ];
  }

  return [
    "Check for stalled drafts. Use this placeholder recommendation until the live team-level diagnostic prompts are configured.",
    "Review submission flow blockers. This sample action stands in for the future OpenAI-authored coaching text.",
    "Recognize visible progress. Temporary copy for now while the business-owner narrative layer is still being wired.",
  ];
}

function buildManagerFrictionNote() {
  return {
    text: "Temporary sample friction note. This section will later use the real prior-week manager note once friction-note ingestion is configured.",
    attr: "Sample placeholder only - real friction-note routing is not configured yet.",
  };
}

function buildLeaderLede(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.lede.trim().length > 0) {
    return report.content.lede;
  }

  if (report.scopeSummary?.emptyStateMessage) {
    return report.scopeSummary.emptyStateMessage;
  }

  return `Temporary leader-rollup preview: the full span comparison is not configured yet, but currently visible activity shows ${formatNumber(
    report.metrics.pipelineEntriesCreated,
  )} pipeline entr${report.metrics.pipelineEntriesCreated === 1 ? "y" : "ies"}, ${formatNumber(
    report.metrics.projectsConfirmed,
  )} confirmed project${report.metrics.projectsConfirmed === 1 ? "" : "s"}, and ${formatNumber(
    report.metrics.reworkEvents,
  )} rework event${report.metrics.reworkEvents === 1 ? "" : "s"}.`;
}

function buildLeaderCoachingItems(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.content.coachingItems.length >= 3) {
    return report.content.coachingItems.slice(0, 3);
  }

  const activeEntries = report.scopeEntries.filter((entry) => entry.hasActivity);

  if (report.scopeSummary?.emptyStateMessage) {
    return [
      "No eligible business-owner rollup activity was found in the selected period. This leader preview remains in empty-state mode for now.",
      "Keep the selected date range under review before drawing conclusions. Activity may exist outside the current window.",
      "This placeholder coaching area will later use grounded AI text once hierarchy and scoring rules are fully configured.",
    ];
  }

  if (activeEntries.length > 0) {
    return [
      `${activeEntries[0]?.userName ?? "This business owner"} is the clearest activity signal in the current window. Use this placeholder note until the leader-diagnostic layer is configured.`,
      `${activeEntries[1]?.userName ?? "Another business owner"} can be reviewed next for visible submission and approval patterns.`,
      `${activeEntries[2]?.userName ?? "The remaining business owners"} are retained here as placeholders until the comparative coaching logic is configured.`,
    ];
  }

  return [
    "Temporary sample coaching note: prioritize the manager with the clearest drop in visible activity once real span-level scoring is configured.",
    "Temporary sample coaching note: review rework patterns across the span to identify whether the estimate flow is unclear or being rushed.",
    "Temporary sample coaching note: capture what is working on the strongest team and look for behavior worth porting across the rest of the span.",
  ];
}

function buildLeaderFrictionTheme() {
  return {
    text: "Temporary sample friction theme. This section will later summarize the strongest repeated note across the leader span using the real friction-note pipeline.",
    attr: "Sample placeholder only - leader friction aggregation is not configured yet.",
  };
}

function getScopeEntryStatusHtml(entry: ReportScopeEntry) {
  const statusText = getScopeEntryStatusText(entry);

  if (statusText === "N/A" || !entry.status.color) {
    return escapeHtml(statusText);
  }

  const color =
    entry.status.color === "green" ? colors.tealDeep : entry.status.color === "yellow" ? colors.orangeDeep : colors.pinkDeep;

  return `<span style="font-weight:700;color:${color};">&bull; ${escapeHtml(statusText)}</span>`;
}

function buildLeaderManagerRows(entries: ReportScopeEntry[]) {
  const activeFirst = [...entries].sort((left, right) => {
    if (left.hasActivity !== right.hasActivity) {
      return left.hasActivity ? -1 : 1;
    }

    return left.userName.localeCompare(right.userName);
  });

  const rows = activeFirst.slice(0, 3).map((entry) => ({
    name: entry.userName,
    statusHtml: getScopeEntryStatusHtml(entry),
    score: entry.score === null ? "N/A" : formatNumber(entry.score),
    active: entry.activeDisplay ?? "N/A",
    confirmed: entry.hasActivity ? formatNumber(entry.metrics.projectsConfirmed) : "0",
  }));

  while (rows.length < 3) {
    rows.push({ name: "N/A", statusHtml: "N/A", score: "N/A", active: "N/A", confirmed: "N/A" });
  }

  return rows;
}

const colors = {
  ink: "#1A1A1A",
  body: "#2B2B2B",
  muted: "#6B6B6B",
  faint: "#9A9A9A",
  hairline: "#EDEDEA",
  bg: "#FAFAF9",
  paper: "#FFFFFF",
  teal: "#00ADAA",
  tealDeep: "#00807E",
  tealTint: "#F0F9F8",
  pink: "#ED347B",
  pinkDeep: "#C0245F",
  pinkTint: "#FCEDF3",
  orange: "#F79124",
  orangeDeep: "#C2710F",
  orangeTint: "#FDF3E5",
};

const SALTHUB_SUPPORT_LABEL = "Salt Hub Support";
const SALTHUB_SUPPORT_URL = "https://support.saltxcai.com/";

function metricCell(params: {
  value: string;
  label: string;
  sub?: string;
  color?: string;
  width?: string;
}) {
  return `<td valign="top" width="${params.width ?? "33.33%"}" style="padding:0 16px 22px 0;">
    <div style="font-family:Arial, Helvetica, sans-serif;font-size:32px;line-height:1;font-weight:700;letter-spacing:-0.03em;color:${params.color ?? colors.ink};">${escapeHtml(params.value)}</div>
    <div style="padding-top:7px;font-family:Arial, Helvetica, sans-serif;font-size:13px;line-height:1.35;color:${colors.body};">${escapeHtml(params.label)}</div>
    ${params.sub ? `<div style="padding-top:4px;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.45;color:${colors.faint};">${formatMultilineText(params.sub)}</div>` : ""}
  </td>`;
}

function chunk<T>(items: T[], size: number) {
  const rows: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }

  return rows;
}

function metricsTable(
  items: Array<{
    value: string;
    label: string;
    sub?: string;
    color?: string;
  }>,
  columns: number,
) {
  const cellWidth = `${100 / columns}%`;
  const rows = chunk(items, columns)
    .map((row) => {
      const cells = [...row];

      while (cells.length < columns) {
        cells.push({ value: "", label: "", sub: "", color: colors.ink });
      }

      return `<tr>${cells
        .map((item) =>
          item.label
            ? metricCell({ ...item, width: cellWidth })
            : `<td width="${cellWidth}" style="padding:0 16px 22px 0;">&nbsp;</td>`,
        )
        .join("")}</tr>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function sectionLabel(label: string) {
  return `<div style="padding-bottom:20px;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${colors.muted};">${escapeHtml(label)}</div>`;
}

function sectionWrap(content: string, withBorder = true) {
  return `<tr>
    <td style="padding:32px 0;${withBorder ? `border-bottom:1px solid ${colors.hairline};` : ""}">
      ${content}
    </td>
  </tr>`;
}

function statusPill(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const variant = getStatusVariant(report);

  return `<span style="display:inline-block;padding:7px 10px;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:3px;background:${variant.background};color:${variant.color};">${escapeHtml(variant.text)}</span>`;
}

function headerBlock(params: {
  eyebrowSuffix: string;
  metaLabel: string;
  statusHtml: string;
  title: string;
  subline: string;
}) {
  return `
    <tr>
      <td style="padding:0 0 32px 0;font-family:Arial, Helvetica, sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${colors.pink};">
        SALT HUB&nbsp;&nbsp;/&nbsp;&nbsp;${escapeHtml(params.eyebrowSuffix)}
      </td>
    </tr>
    <tr>
      <td style="padding:0 0 28px 0;border-bottom:1px solid ${colors.hairline};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0 0 14px 0;font-family:Arial, Helvetica, sans-serif;font-size:12px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:${colors.muted};">
              ${escapeHtml(params.metaLabel)}&nbsp;&nbsp;${params.statusHtml}
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial, Helvetica, sans-serif;font-size:28px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:${colors.ink};">
              ${params.title}
            </td>
          </tr>
          <tr>
            <td style="padding-top:8px;font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.muted};">
              ${formatMultilineText(params.subline)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function prose(text: string) {
  return `<div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:1.65;color:${colors.body};">${formatMultilineText(text)}</div>`;
}

function ledeBlock(text: string) {
  return `<tr>
    <td style="padding:32px 0;border-bottom:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:19px;line-height:1.45;letter-spacing:-0.005em;color:${colors.ink};">
      ${formatMultilineText(text)}
    </td>
  </tr>`;
}

function actionsList(items: string[]) {
  const rows = items
    .slice(0, 3)
    .map(
      (item, index) => `<tr>
        <td valign="top" width="24" style="padding:0 14px 18px 0;font-family:Arial, Helvetica, sans-serif;font-size:13px;font-weight:700;color:${colors.pink};">${String(index + 1).padStart(2, "0")}</td>
        <td valign="top" style="padding:0 0 18px 0;font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:1.6;color:${colors.body};">${formatMultilineText(item)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`;
}

function quoteBlock(text: string, attribution: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="2" style="background:${colors.teal};font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:4px 0 4px 20px;">
        <div style="font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:1.6;color:${colors.body};font-style:italic;">${formatMultilineText(text)}</div>
        <div style="padding-top:10px;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.45;color:${colors.faint};">${formatMultilineText(attribution)}</div>
      </td>
    </tr>
  </table>`;
}

function compareTable(rows: Array<{ name: string; statusHtml: string; score: string; active: string; confirmed: string }>) {
  const bodyRows = rows
    .map(
      (row) => `<tr>
        <td style="padding:14px 10px;border-top:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.ink};font-weight:700;">${escapeHtml(row.name)}</td>
        <td style="padding:14px 10px;border-top:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.body};">${row.statusHtml}</td>
        <td align="right" style="padding:14px 10px;border-top:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.body};font-weight:700;">${escapeHtml(row.score)}</td>
        <td align="right" style="padding:14px 10px;border-top:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.body};">${escapeHtml(row.active)}</td>
        <td align="right" style="padding:14px 0 14px 10px;border-top:1px solid ${colors.hairline};font-family:Arial, Helvetica, sans-serif;font-size:14px;line-height:1.5;color:${colors.body};">${escapeHtml(row.confirmed)}</td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <thead>
      <tr>
        <th align="left" style="padding:0 10px 10px 0;font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${colors.muted};">Manager</th>
        <th align="left" style="padding:0 10px 10px 10px;font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${colors.muted};">Status</th>
        <th align="right" style="padding:0 10px 10px 10px;font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${colors.muted};">Score</th>
        <th align="right" style="padding:0 10px 10px 10px;font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${colors.muted};">Active</th>
        <th align="right" style="padding:0 0 10px 10px;font-family:Arial, Helvetica, sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;text-transform:uppercase;color:${colors.muted};">Confirmed</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>`;
}

function footerBlock(lines: string[]) {
  const supportLinkHtml = `<a href="${SALTHUB_SUPPORT_URL}" target="_blank" rel="noopener noreferrer" style="color:${colors.faint};text-decoration:underline;">${escapeHtml(SALTHUB_SUPPORT_LABEL)}</a>`;

  return `<tr>
    <td style="padding-top:30px;font-family:Arial, Helvetica, sans-serif;font-size:12px;line-height:1.55;color:${colors.faint};text-align:center;">
      ${lines
        .map((line) => formatMultilineText(line).replace(escapeHtml(SALTHUB_SUPPORT_LABEL), supportLinkHtml))
        .join("<br />")}
    </td>
  </tr>`;
}

function wrapEmailDocument(params: {
  preheader: string;
  innerHtml: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Salthub Report Card</title>
  </head>
  <body style="margin:0;padding:0;background:${colors.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colors.bg};margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:24px 12px 48px 12px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:${colors.paper};">
            <tr>
              <td style="padding:56px 40px 56px 40px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${params.innerHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderTeamMemberHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const activeDaysConfigured = report.metrics.activeDaysCount !== null;
  const lastActivityConfigured = report.metrics.lastActivityTs !== null;
  const wowConfigured = report.metrics.wowScoreDelta !== null && report.metrics.priorPeriodScore !== null;
  const estimatesCreatedConfigured = report.metrics.estimatesCreated !== null;
  const approvalsReceivedConfigured = report.metrics.approvalsCompleted > 0;

  const body = `
    ${headerBlock({
      eyebrowSuffix: "WEEKLY ADOPTION BRIEF / YOUR WEEK",
      metaLabel: formatWeekLabel(report.reportPeriod.startDate),
      statusHtml: statusPill(report),
      title: `Your week in Salt Hub, ${escapeHtml(report.userName)}`,
      subline: `${humanizeTeam(report.department)} · ${humanizeRole(report.role)}`,
    })}
    ${ledeBlock(buildLede(report))}
    ${sectionWrap(
      `${sectionLabel("Your activity")}${metricsTable(
        [
          {
            value: formatNumber(report.metrics.loginCount),
            label: "Logins",
            sub: activeDaysConfigured
              ? `across ${formatNumber(report.metrics.activeDaysCount ?? 0)} day${report.metrics.activeDaysCount === 1 ? "" : "s"}`
              : "days not configured yet",
            color: colors.tealDeep,
          },
          {
            value: activeDaysConfigured ? formatNumber(report.metrics.activeDaysCount ?? 0) : "N/A",
            label: "Active days",
            sub: activeDaysConfigured ? "tracked active days" : "not configured yet",
            color: colors.tealDeep,
          },
          {
            value: lastActivityConfigured ? formatLastActiveValue(report.metrics.lastActivityTs) : "N/A",
            label: "Last active",
            sub: lastActivityConfigured ? formatLastActiveDetail(report.metrics.lastActivityTs) : "not configured yet",
          },
          {
            value: wowConfigured
              ? `${(report.metrics.wowScoreDelta ?? 0) > 0 ? "+" : ""}${formatNumber(report.metrics.wowScoreDelta ?? 0)}`
              : "N/A",
            label: "Score WoW",
            sub: wowConfigured ? `from ${formatNumber(report.metrics.priorPeriodScore ?? 0)}` : "scoring not configured yet",
          },
        ],
        4,
      )}`,
    )}
    ${sectionWrap(
      `${sectionLabel("What you got done")}${metricsTable(
        [
          {
            value: formatNumber(report.metrics.pipelineEntriesCreated),
            label: "Pipeline entries created",
            color: colors.tealDeep,
          },
          {
            value: estimatesCreatedConfigured ? formatNumber(report.metrics.estimatesCreated ?? 0) : "N/A",
            label: "Estimates created",
            color: colors.tealDeep,
          },
          {
            value: formatNumber(report.metrics.estimatesSubmitted),
            label: "Estimates submitted",
            sub: report.metrics.estimatesSubmitted > 0 ? "current configured count" : "no submitted estimates in this period",
            color: colors.tealDeep,
          },
          {
            value: approvalsReceivedConfigured ? formatNumber(report.metrics.approvalsCompleted) : "N/A",
            label: "Approvals received",
            color: colors.tealDeep,
          },
          {
            value: formatNumber(report.metrics.projectsConfirmed),
            label: "Projects you confirmed",
            color: colors.tealDeep,
          },
          {
            value: formatNumber(report.metrics.reworkEvents),
            label: "Rework events",
            sub: report.metrics.reworkEvents === 0 ? "clean week" : "follow-up activity recorded",
          },
        ],
        3,
      )}`,
    )}
    ${sectionWrap(`${sectionLabel("One observation")}${prose(buildObservation(report))}`, false)}
    ${footerBlock([
      "This is a personal read just for you · Used to help us improve Salt Hub, not to rank you",
      "Your manager sees a team rollup, not your individual card · Salt Hub Support",
    ])}
  `;

  return wrapEmailDocument({
    preheader: `${report.userName} weekly preview`,
    innerHtml: body,
  });
}

function renderBusinessOwnerHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const actions = buildManagerActions(report);
  const friction = buildManagerFrictionNote();
  const activeChildCount = report.scopeSummary?.activeChildCount ?? 0;
  const teamSize = report.scopeSummary?.teamSize ?? report.scopeSummary?.eligibleChildCount ?? 0;

  const body = `
    ${headerBlock({
      eyebrowSuffix: "WEEKLY ADOPTION BRIEF / MANAGER",
      metaLabel: formatWeekLabel(report.reportPeriod.startDate),
      statusHtml: statusPill(report),
      title: `${escapeHtml(report.userName)} — ${escapeHtml(humanizeTeam(report.department))}`,
      subline: `Team size: ${formatNumber(teamSize)} - Active this period: ${formatNumber(activeChildCount)}`,
    })}
    ${ledeBlock(buildManagerLede(report))}
    ${sectionWrap(
      `${sectionLabel("The numbers")}${metricsTable(
        [
          {
            value: `${formatNumber(activeChildCount)} of ${formatNumber(teamSize)}`,
            label: "Active users",
            sub:
              teamSize === 0
                ? "no eligible Account Management users found"
                : activeChildCount === 0
                  ? "no eligible Account Management user activity in this period"
                  : "eligible Account Management user activity in this period",
            color: colors.orangeDeep,
          },
          {
            value: formatNumber(report.metrics.pipelineEntriesCreated),
            label: "Pipeline entries created",
            sub: "based on currently available SaltHub activity",
            color: colors.tealDeep,
          },
          {
            value: "N/A",
            label: "Estimates submitted",
            sub: "team submission rollup not configured yet",
            color: colors.orangeDeep,
          },
          {
            value: formatNumber(report.metrics.approvalsCompleted),
            label: "Approvals completed",
            color: colors.tealDeep,
          },
          {
            value: formatNumber(report.metrics.projectsConfirmed),
            label: "Projects confirmed",
            color: colors.tealDeep,
          },
          {
            value: formatNumber(report.metrics.reworkEvents),
            label: "Rework events",
            sub: report.metrics.reworkEvents === 0 ? "no rework recorded" : "rework activity recorded",
          },
        ],
        3,
      )}`,
    )}
    ${sectionWrap(`${sectionLabel("What stands out")}${prose(buildManagerWhatStandsOut(report))}`)}
    ${sectionWrap(`${sectionLabel("Worth doing this week")}${actionsList(actions)}`)}
    ${sectionWrap(`${sectionLabel("Your friction note from last week")}${quoteBlock(friction.text, friction.attr)}`, false)}
    ${footerBlock([
      "Generated by the Salt Hub delivery pipeline · A diagnostic instrument, not a scorecard",
      "Individual user data stays at the manager level · Salt Hub Support",
    ])}
  `;

  return wrapEmailDocument({
    preheader: `${report.userName} manager weekly preview`,
    innerHtml: body,
  });
}

function renderSuperAdminHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const coaching = buildLeaderCoachingItems(report);
  const friction = buildLeaderFrictionTheme();
  const rows = buildLeaderManagerRows(report.scopeEntries);
  const activeChildCount = report.scopeSummary?.activeChildCount ?? 0;
  const managerCount = report.scopeSummary?.managerCount ?? report.scopeSummary?.eligibleChildCount ?? 0;
  const teamSize = report.scopeSummary?.teamSize ?? 0;

  const body = `
    ${headerBlock({
      eyebrowSuffix: "BI-WEEKLY ADOPTION BRIEF / LEADER",
      metaLabel: formatPeriodEndingLabel(report.reportPeriod.endDate),
      statusHtml: statusPill(report),
      title: `${escapeHtml(report.userName)} — ${escapeHtml(humanizeTeam(report.department))} Leadership`,
      subline: `Business owners: ${formatNumber(managerCount)} - Team size: ${formatNumber(teamSize)} - Active this period: ${formatNumber(activeChildCount)} - Leader score: ${report.metrics.score === null ? "N/A" : formatNumber(report.metrics.score)}`,
    })}
    ${ledeBlock(buildLeaderLede(report))}
    ${sectionWrap(`${sectionLabel("Your managers, side by side")}${compareTable(rows)}`)}
    ${sectionWrap(`${sectionLabel("Where to spend coaching time")}${actionsList(coaching)}`)}
    ${sectionWrap(`${sectionLabel("Friction themes across your span")}${quoteBlock(friction.text, friction.attr)}`, false)}
    ${footerBlock([
      "For leadership coaching, not for stack ranking · Individual user data stays at the manager level",
      "Generated by the Salt Hub delivery pipeline · Salt Hub Support",
    ])}
  `;

  return wrapEmailDocument({
    preheader: `${report.userName} leader bi-weekly preview`,
    innerHtml: body,
  });
}

function renderFallbackHtml(report: NormalizedUserReport) {
  const visibleMissingFields = getVisibleMissingFields(report);
  const missingFields =
    visibleMissingFields.length > 0
      ? `<tr><td style="padding:0 0 20px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:12px 14px;border:1px solid #fcd34d;background:#fffbeb;font-family:Arial, Helvetica, sans-serif;color:#92400e;"><strong style="display:block;padding-bottom:6px;">Missing fields</strong>${escapeHtml(visibleMissingFields.join(", "))}</td></tr></table></td></tr>`
      : "";

  return wrapEmailDocument({
    preheader: `${report.userName} report preview`,
    innerHtml: `
      <tr>
        <td style="padding:0 0 8px 0;font-family:Arial, Helvetica, sans-serif;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">Salthub Report Card</td>
      </tr>
      <tr>
        <td style="padding:0 0 8px 0;font-family:Arial, Helvetica, sans-serif;font-size:30px;line-height:1.1;font-weight:700;color:#0f172a;">${escapeHtml(report.userName)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 20px 0;font-family:Arial, Helvetica, sans-serif;font-size:15px;line-height:1.6;color:#64748b;">${escapeHtml(report.reportPeriod.displayLabel)} - ${escapeHtml(report.role ?? "Role unavailable")} - ${escapeHtml(report.department ?? "Department unavailable")}</td>
      </tr>
      ${missingFields}
      ${sectionWrap(
        `${sectionLabel("Activity metrics")}${prose(
          `Login count: ${formatNumber(report.metrics.loginCount)}\nProjects confirmed: ${formatNumber(
            report.metrics.projectsConfirmed,
          )}\nSent for business owner approval: ${formatNumber(
            report.metrics.sentForBusinessOwnerApproval,
          )}\nPipeline entries created: ${formatNumber(
            report.metrics.pipelineEntriesCreated,
          )}\nEstimates submitted: ${formatNumber(report.metrics.estimatesSubmitted)}\nFirst approvals: ${formatNumber(
            report.metrics.firstApprovals,
          )}\nApprovals completed: ${formatNumber(report.metrics.approvalsCompleted)}\nClient approvals: ${formatNumber(
            report.metrics.clientApprovals,
          )}\nRework events: ${formatNumber(report.metrics.reworkEvents)}`,
        )}`,
        false,
      )}
    `,
  });
}

export async function renderUserEmailHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (isIndividualUserReportRole(report.role)) {
    return {
      html: renderTeamMemberHtml(report),
      templateMode: "file-template" as const,
    };
  }

  if (report.role === "business_owner") {
    return {
      html: renderBusinessOwnerHtml(report),
      templateMode: "file-template" as const,
    };
  }

  if (report.role === "super_admin") {
    return {
      html: renderSuperAdminHtml(report),
      templateMode: "file-template" as const,
    };
  }

  return {
    html: renderFallbackHtml({ ...report, html: "", templateMode: "fallback-template" }),
    templateMode: "fallback-template" as const,
  };
}
