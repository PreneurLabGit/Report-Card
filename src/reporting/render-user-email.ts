import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { NormalizedUserReport } from "@/lib/domain";
import { formatDate, formatNumber } from "@/lib/format";

const GENERIC_TEMPLATE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "User_email.html"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "user_email.html"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "templates", "User_email.html"),
];

const TEAM_MEMBER_TEMPLATE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "templates", "teammember_email.html"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "teammember_email.html"),
];

const CSS_TEMPLATE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "templates", "report-card.css"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "report-card.css"),
];

let cachedGenericTemplate:
  | {
      sourcePath: string;
      contents: string;
    }
  | null
  | undefined;

let cachedTeamMemberTemplate:
  | {
      sourcePath: string;
      contents: string;
    }
  | null
  | undefined;

let cachedCssTemplate:
  | {
      sourcePath: string;
      contents: string;
    }
  | null
  | undefined;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadOptionalFile(
  candidates: string[],
  cacheRef: "generic" | "team-member" | "css",
): Promise<{ sourcePath: string; contents: string } | null> {
  const currentCache =
    cacheRef === "generic"
      ? cachedGenericTemplate
      : cacheRef === "team-member"
        ? cachedTeamMemberTemplate
        : cachedCssTemplate;

  if (currentCache !== undefined) {
    return currentCache;
  }

  for (const resolved of candidates) {
    try {
      await access(resolved);
      const value = {
        sourcePath: resolved,
        contents: await readFile(resolved, "utf8"),
      };

      if (cacheRef === "generic") {
        cachedGenericTemplate = value;
      } else if (cacheRef === "team-member") {
        cachedTeamMemberTemplate = value;
      } else {
        cachedCssTemplate = value;
      }

      return value;
    } catch {
      continue;
    }
  }

  if (cacheRef === "generic") {
    cachedGenericTemplate = null;
  } else if (cacheRef === "team-member") {
    cachedTeamMemberTemplate = null;
  } else {
    cachedCssTemplate = null;
  }

  return null;
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
    return "Your current preview shows a clean workflow week with no recorded rework. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
  }

  return "Your current preview shows completed activity across the week, with some follow-up still visible in the rework count. Some scoring and activity-detail fields are still being configured, so this preview focuses on the metrics already available from SaltHub.";
}

function buildTemplateFields(report: NormalizedUserReport) {
  return {
    report_period: report.reportPeriod.displayLabel,
    report_week_start: report.reportPeriod.startDate,
    user_name: report.userName,
    recipientEmail: report.recipientEmail ?? "",
    role_label: report.role ?? "",
    team_label: report.department ?? "",
    login_count: String(report.metrics.loginCount),
    projects_confirmed: String(report.metrics.projectsConfirmed),
    sent_for_business_owner_approval: String(report.metrics.sentForBusinessOwnerApproval),
    pipeline_entries_created: String(report.metrics.pipelineEntriesCreated),
    estimates_submitted: String(report.metrics.estimatesSubmitted),
    approvals_completed: String(report.metrics.approvalsCompleted),
    client_approvals: String(report.metrics.clientApprovals),
    first_approvals: String(report.metrics.firstApprovals),
    rework_events: String(report.metrics.reworkEvents),
    estimates_created: report.metrics.estimatesCreated === null ? "N/A" : String(report.metrics.estimatesCreated),
    active_days_count: report.metrics.activeDaysCount === null ? "N/A" : String(report.metrics.activeDaysCount),
    last_activity_ts: report.metrics.lastActivityTs ?? "N/A",
    score: report.metrics.score === null ? "N/A" : String(report.metrics.score),
    prior_week_score: report.metrics.priorPeriodScore === null ? "N/A" : String(report.metrics.priorPeriodScore),
    wow_score_delta: report.metrics.wowScoreDelta === null ? "N/A" : String(report.metrics.wowScoreDelta),
    status_color: report.status.color ?? "N/A",
    status_label: report.status.label ?? "N/A",
    lede: report.content.lede,
    observation: report.content.observation,
  };
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

async function renderTeamMemberHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const [template, css] = await Promise.all([
    loadOptionalFile(TEAM_MEMBER_TEMPLATE_CANDIDATES, "team-member"),
    loadOptionalFile(CSS_TEMPLATE_CANDIDATES, "css"),
  ]);

  if (!template || !css) {
    return null;
  }

  const statusVariant = getStatusVariant(report);
  const activeDaysConfigured = report.metrics.activeDaysCount !== null;
  const lastActivityConfigured = report.metrics.lastActivityTs !== null;
  const wowConfigured = report.metrics.wowScoreDelta !== null && report.metrics.priorPeriodScore !== null;
  const estimatesCreatedConfigured = report.metrics.estimatesCreated !== null;
  const approvalsReceivedConfigured = report.metrics.approvalsCompleted > 0;
  const roleLabel = humanizeRole(report.role);
  const teamLabel = humanizeTeam(report.department);

  const fields = {
    embedded_css: `${css.contents}

.status-tag--na { background: #f5f5f4; color: #6b7280; }
.status-tag--na::before { background: #a8a29e; }
`,
    preheader: `${report.userName} weekly preview`,
    week_label: `WEEK OF ${formatWeekLabel(report.reportPeriod.startDate)}`,
    status_class: statusVariant.statusClass,
    status_text: statusVariant.statusText,
    user_name: report.userName,
    team_label: teamLabel,
    role_label: roleLabel,
    lede: buildLede(report),
    login_count: formatNumber(report.metrics.loginCount),
    login_sub: activeDaysConfigured ? `across ${formatNumber(report.metrics.activeDaysCount ?? 0)} day${report.metrics.activeDaysCount === 1 ? "" : "s"}` : "days not configured yet",
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

  return injectFields(template.contents, fields);
}

export async function renderUserEmailHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  if (report.role === "team_member") {
    const teamMemberHtml = await renderTeamMemberHtml(report);

    if (teamMemberHtml) {
      return {
        html: teamMemberHtml,
        templateMode: "file-template" as const,
      };
    }
  }

  const template = await loadOptionalFile(GENERIC_TEMPLATE_CANDIDATES, "generic");

  if (!template) {
    return {
      html: renderFallbackHtml({ ...report, html: "", templateMode: "fallback-template" }),
      templateMode: "fallback-template" as const,
    };
  }

  return {
    html: injectFields(template.contents, buildTemplateFields({ ...report, html: "", templateMode: "file-template" })),
    templateMode: "file-template" as const,
  };
}
