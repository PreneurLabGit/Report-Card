import type { NormalizedUserReport } from "@/lib/domain";
import { formatDate, formatNumber } from "@/lib/format";
import {
  BUSINESS_OWNER_TEMPLATE,
  REPORT_CARD_CSS,
  SUPER_ADMIN_TEMPLATE,
  TEAM_MEMBER_TEMPLATE,
} from "@/reporting/email-template-assets";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
    return "N/A";
  }

  const parsed = new Date(lastActivityTs);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
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
      statusClass: "status-tag--na",
      statusText: "N/A",
    };
  }

  return {
    statusClass: `status-tag--${report.status.color}`,
    statusText: `${report.status.color.toUpperCase()} - ${report.status.label.toUpperCase()}`,
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
  if (report.content.observation.trim().length > 0) {
    return report.content.observation;
  }

  if (report.metrics.reworkEvents === 0) {
    return "Sample observation text. Your current preview shows a clean workflow week with no recorded rework. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
  }

  return "Sample observation text. Your current preview shows completed activity across the week, with some follow-up still visible in the rework count. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
}

function buildManagerLede(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
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

function buildManagerWhatStandsOut() {
  return "Temporary sample insight: activity is visible in the current SaltHub export, but the full business-owner rollup logic is not configured yet. Use this section as a content placeholder while we wire the OpenAI-generated diagnostic summary on top of the real aggregated metrics.";
}

function buildManagerActions() {
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
  return `Temporary leader-rollup preview: the full span comparison is not configured yet, but currently visible activity shows ${formatNumber(
    report.metrics.pipelineEntriesCreated,
  )} pipeline entr${report.metrics.pipelineEntriesCreated === 1 ? "y" : "ies"}, ${formatNumber(
    report.metrics.projectsConfirmed,
  )} confirmed project${report.metrics.projectsConfirmed === 1 ? "" : "s"}, and ${formatNumber(
    report.metrics.reworkEvents,
  )} rework event${report.metrics.reworkEvents === 1 ? "" : "s"}.`;
}

function buildLeaderCoachingItems() {
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

function buildLeaderManagerRows() {
  return [
    { name: "Manager A", status: "N/A", score: "N/A", active: "N/A", confirmed: "N/A" },
    { name: "Manager B", status: "N/A", score: "N/A", active: "N/A", confirmed: "N/A" },
    { name: "Manager C", status: "N/A", score: "N/A", active: "N/A", confirmed: "N/A" },
  ];
}

function renderFallbackHtml(report: NormalizedUserReport) {
  const missingFields =
    report.missingFields.length > 0
      ? `<div style="margin:0 0 20px;padding:12px 14px;border:1px solid #fcd34d;border-radius:12px;background:#fffbeb;color:#92400e;">
          <strong style="display:block;margin:0 0 6px;">Missing fields</strong>
          <div>${escapeHtml(report.missingFields.join(", "))}</div>
        </div>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f3f6fb;font-family:Roboto,Arial,sans-serif;color:#0f172a;">
    <main style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:18px;padding:24px;">
      <p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Salthub Report Card</p>
      <h1 style="margin:0 0 8px;font-size:30px;line-height:1.1;">${escapeHtml(report.userName)}</h1>
      <p style="margin:0 0 20px;color:#64748b;">${escapeHtml(report.reportPeriod.displayLabel)} - ${escapeHtml(report.role ?? "Role unavailable")} - ${escapeHtml(report.department ?? "Department unavailable")}</p>
      ${missingFields}
      <section style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 20px;">
        <div style="padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fbff;"><strong style="display:block;font-size:12px;color:#64748b;text-transform:uppercase;">Recipient</strong><span>${escapeHtml(report.recipientEmail ?? "Missing email")}</span></div>
        <div style="padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fbff;"><strong style="display:block;font-size:12px;color:#64748b;text-transform:uppercase;">Preview status</strong><span>${escapeHtml(report.previewStatus)}</span></div>
      </section>
      <section style="margin:0 0 20px;">
        <h2 style="margin:0 0 10px;font-size:18px;">Activity metrics</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.7;color:#334155;">
          <li>Login count: ${formatNumber(report.metrics.loginCount)}</li>
          <li>Projects confirmed: ${formatNumber(report.metrics.projectsConfirmed)}</li>
          <li>Sent for business owner approval: ${formatNumber(report.metrics.sentForBusinessOwnerApproval)}</li>
          <li>Pipeline entries created: ${formatNumber(report.metrics.pipelineEntriesCreated)}</li>
          <li>Estimates submitted: ${formatNumber(report.metrics.estimatesSubmitted)}</li>
          <li>First approvals: ${formatNumber(report.metrics.firstApprovals)}</li>
          <li>Approvals completed: ${formatNumber(report.metrics.approvalsCompleted)}</li>
          <li>Client approvals: ${formatNumber(report.metrics.clientApprovals)}</li>
          <li>Rework events: ${formatNumber(report.metrics.reworkEvents)}</li>
        </ul>
      </section>
      <section style="margin:0 0 20px;">
        <h2 style="margin:0 0 10px;font-size:18px;">Score signals</h2>
        <p style="margin:0;color:#334155;">Score: ${report.metrics.score ?? "N/A"} - Prior period score: ${report.metrics.priorPeriodScore ?? "N/A"} - Delta: ${report.metrics.wowScoreDelta ?? "N/A"}</p>
      </section>
      <section>
        <h2 style="margin:0 0 10px;font-size:18px;">Unavailable fields</h2>
        <p style="margin:0;color:#334155;">Estimates created: ${report.metrics.estimatesCreated ?? "N/A"} - Active days: ${report.metrics.activeDaysCount ?? "N/A"} - Last activity: ${report.metrics.lastActivityTs ? formatDate(report.metrics.lastActivityTs) : "N/A"}</p>
      </section>
    </main>
  </body>
</html>`;
}

function injectFields(template: string, fields: Record<string, string>) {
  return Object.entries(fields).reduce((result, [key, value]) => {
    const escaped = escapeHtml(value);
    return result
      .replaceAll(`{{${key}}}`, escaped)
      .replaceAll(`[[${key}]]`, escaped)
      .replaceAll(`__${key}__`, escaped);
  }, template);
}

function buildEmbeddedCss() {
  return `${REPORT_CARD_CSS}

.status-tag--na { background: #f5f5f4; color: #6b7280; }
.status-tag--na::before { background: #a8a29e; }`;
}

function renderTeamMemberHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const statusVariant = getStatusVariant(report);
  const activeDaysConfigured = report.metrics.activeDaysCount !== null;
  const lastActivityConfigured = report.metrics.lastActivityTs !== null;
  const wowConfigured = report.metrics.wowScoreDelta !== null && report.metrics.priorPeriodScore !== null;
  const estimatesCreatedConfigured = report.metrics.estimatesCreated !== null;
  const approvalsReceivedConfigured = report.metrics.approvalsCompleted > 0;

  const fields = {
    embedded_css: buildEmbeddedCss(),
    preheader: `${report.userName} weekly preview`,
    week_label: `WEEK OF ${formatWeekLabel(report.reportPeriod.startDate)}`,
    status_class: statusVariant.statusClass,
    status_text: statusVariant.statusText,
    user_name: report.userName,
    team_label: humanizeTeam(report.department),
    role_label: humanizeRole(report.role),
    lede: buildLede(report),
    login_count: formatNumber(report.metrics.loginCount),
    login_sub: activeDaysConfigured
      ? `across ${formatNumber(report.metrics.activeDaysCount ?? 0)} day${report.metrics.activeDaysCount === 1 ? "" : "s"}`
      : "days not configured yet",
    active_days_value: activeDaysConfigured ? formatNumber(report.metrics.activeDaysCount ?? 0) : "N/A",
    active_days_sub: activeDaysConfigured ? "tracked active days" : "not configured yet",
    last_active_value: lastActivityConfigured ? formatLastActiveValue(report.metrics.lastActivityTs) : "N/A",
    last_active_sub: lastActivityConfigured ? formatLastActiveDetail(report.metrics.lastActivityTs) : "not configured yet",
    wow_delta_value: wowConfigured
      ? `${(report.metrics.wowScoreDelta ?? 0) > 0 ? "+" : ""}${formatNumber(report.metrics.wowScoreDelta ?? 0)}`
      : "N/A",
    wow_delta_sub: wowConfigured ? `from ${formatNumber(report.metrics.priorPeriodScore ?? 0)}` : "scoring not configured yet",
    pipeline_entries_created: formatNumber(report.metrics.pipelineEntriesCreated),
    estimates_created: estimatesCreatedConfigured ? formatNumber(report.metrics.estimatesCreated ?? 0) : "N/A",
    estimates_submitted: formatNumber(report.metrics.estimatesSubmitted),
    estimates_submitted_sub:
      report.metrics.estimatesSubmitted > 0 ? "current configured count" : "no submitted estimates in this period",
    approvals_received: approvalsReceivedConfigured ? formatNumber(report.metrics.approvalsCompleted) : "N/A",
    projects_confirmed: formatNumber(report.metrics.projectsConfirmed),
    rework_events: formatNumber(report.metrics.reworkEvents),
    rework_sub: report.metrics.reworkEvents === 0 ? "clean week" : "follow-up activity recorded",
    observation: buildObservation(report),
  };

  return injectFields(TEAM_MEMBER_TEMPLATE, fields);
}

function renderBusinessOwnerHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const statusVariant = getStatusVariant(report);
  const actions = buildManagerActions();
  const friction = buildManagerFrictionNote();

  const fields = {
    embedded_css: buildEmbeddedCss(),
    preheader: `${report.userName} manager weekly preview`,
    week_label: `WEEK OF ${formatWeekLabel(report.reportPeriod.startDate)}`,
    status_class: statusVariant.statusClass,
    status_text: statusVariant.statusText,
    user_name: report.userName,
    team_title: humanizeTeam(report.department),
    manager_subline: "Expected users: N/A - 4-week active rate: N/A",
    lede: buildManagerLede(report),
    active_users_value: "N/A",
    active_users_sub: "team active-user rollup not configured yet",
    pipeline_entries_created: formatNumber(report.metrics.pipelineEntriesCreated),
    pipeline_entries_sub: "based on currently available SaltHub activity",
    estimates_submitted_value: "N/A",
    estimates_submitted_sub: "team submission rollup not configured yet",
    approvals_completed: formatNumber(report.metrics.approvalsCompleted),
    projects_confirmed: formatNumber(report.metrics.projectsConfirmed),
    rework_events: formatNumber(report.metrics.reworkEvents),
    rework_sub: report.metrics.reworkEvents === 0 ? "no rework recorded" : "rework activity recorded",
    what_stands_out: buildManagerWhatStandsOut(),
    worth_doing_1: actions[0] ?? "",
    worth_doing_2: actions[1] ?? "",
    worth_doing_3: actions[2] ?? "",
    friction_note_text: friction.text,
    friction_note_attr: friction.attr,
  };

  return injectFields(BUSINESS_OWNER_TEMPLATE, fields);
}

function renderSuperAdminHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const statusVariant = getStatusVariant(report);
  const coaching = buildLeaderCoachingItems();
  const friction = buildLeaderFrictionTheme();
  const rows = buildLeaderManagerRows();

  const fields = {
    embedded_css: buildEmbeddedCss(),
    preheader: `${report.userName} leader bi-weekly preview`,
    period_label: `TWO WEEKS ENDING ${formatWeekLabel(report.reportPeriod.endDate)}`,
    status_class: statusVariant.statusClass,
    status_text: statusVariant.statusText,
    user_name: report.userName,
    leader_title: `${humanizeTeam(report.department)} Leadership`,
    leader_subline: "Managers: N/A - Expected users: N/A - Leader score: N/A",
    lede: buildLeaderLede(report),
    manager_1_name: rows[0]?.name ?? "N/A",
    manager_1_status: rows[0]?.status ?? "N/A",
    manager_1_score: rows[0]?.score ?? "N/A",
    manager_1_active: rows[0]?.active ?? "N/A",
    manager_1_confirmed: rows[0]?.confirmed ?? "N/A",
    manager_2_name: rows[1]?.name ?? "N/A",
    manager_2_status: rows[1]?.status ?? "N/A",
    manager_2_score: rows[1]?.score ?? "N/A",
    manager_2_active: rows[1]?.active ?? "N/A",
    manager_2_confirmed: rows[1]?.confirmed ?? "N/A",
    manager_3_name: rows[2]?.name ?? "N/A",
    manager_3_status: rows[2]?.status ?? "N/A",
    manager_3_score: rows[2]?.score ?? "N/A",
    manager_3_active: rows[2]?.active ?? "N/A",
    manager_3_confirmed: rows[2]?.confirmed ?? "N/A",
    coaching_1: coaching[0] ?? "",
    coaching_2: coaching[1] ?? "",
    coaching_3: coaching[2] ?? "",
    friction_theme_text: friction.text,
    friction_theme_attr: friction.attr,
  };

  return injectFields(SUPER_ADMIN_TEMPLATE, fields);
}

export async function renderUserEmailHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.role === "team_member") {
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
