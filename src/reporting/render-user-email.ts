import { access, readFile } from "node:fs/promises";
import path from "node:path";

import type { NormalizedUserReport } from "@/lib/domain";
import { formatDate, formatNumber } from "@/lib/format";

const TEMPLATE_CANDIDATES = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "User_email.html"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "user_email.html"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "templates", "User_email.html"),
];

let cachedTemplate:
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

async function loadTemplateFile() {
  if (cachedTemplate !== undefined) {
    return cachedTemplate;
  }

  for (const resolved of TEMPLATE_CANDIDATES) {
    try {
      await access(resolved);
      cachedTemplate = {
        sourcePath: resolved,
        contents: await readFile(resolved, "utf8"),
      };
      return cachedTemplate;
    } catch {
      continue;
    }
  }

  cachedTemplate = null;
  return cachedTemplate;
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
    estimates_created: report.metrics.estimatesCreated === null ? "Not available" : String(report.metrics.estimatesCreated),
    active_days_count: report.metrics.activeDaysCount === null ? "Not available" : String(report.metrics.activeDaysCount),
    last_activity_ts: report.metrics.lastActivityTs ?? "Not available",
    score: report.metrics.score === null ? "Not available" : String(report.metrics.score),
    prior_week_score: report.metrics.priorPeriodScore === null ? "Not available" : String(report.metrics.priorPeriodScore),
    wow_score_delta: report.metrics.wowScoreDelta === null ? "Not available" : String(report.metrics.wowScoreDelta),
    status_color: report.status.color ?? "Not available",
    status_label: report.status.label ?? "Not available",
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
      <p style="margin:0 0 20px;color:#64748b;">${escapeHtml(report.reportPeriod.displayLabel)} · ${escapeHtml(report.role ?? "Role unavailable")} · ${escapeHtml(report.department ?? "Department unavailable")}</p>
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
        <p style="margin:0;color:#334155;">Score: ${report.metrics.score ?? "Not available"} · Prior period score: ${report.metrics.priorPeriodScore ?? "Not available"} · Delta: ${report.metrics.wowScoreDelta ?? "Not available"}</p>
      </section>
      <section>
        <h2 style="margin:0 0 10px;font-size:18px;">Unavailable fields</h2>
        <p style="margin:0;color:#334155;">Estimates created: ${report.metrics.estimatesCreated ?? "Not available"} · Active days: ${report.metrics.activeDaysCount ?? "Not available"} · Last activity: ${report.metrics.lastActivityTs ? formatDate(report.metrics.lastActivityTs) : "Not available"}</p>
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

export async function renderUserEmailHtml(report: Omit<NormalizedUserReport, "html" | "templateMode">) {
  const template = await loadTemplateFile();

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
