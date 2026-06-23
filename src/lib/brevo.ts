import type { EmailDeliveryConfigSummary, EmailSendResult, NormalizedUserReport } from "@/lib/domain";

class BrevoEmailError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BrevoEmailError";
    this.status = status;
  }
}

const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);

  if (!value) {
    throw new BrevoEmailError(`Missing required environment variable: ${name}.`);
  }

  return value;
}

function getEmailMode(): "test" | "live" {
  const configuredMode = getOptionalEnv("REPORT_EMAIL_MODE");

  if (configuredMode === "live") {
    return "live";
  }

  if (configuredMode === "test") {
    return "test";
  }

  return getOptionalEnv("REPORT_EMAIL_TEST_OVERRIDE") ? "test" : "live";
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getDefaultSenderName() {
  return getOptionalEnv("BREVO_SENDER_NAME") ?? "Salthub Report Card";
}

export function getEmailDeliveryConfigSummary(): EmailDeliveryConfigSummary {
  const senderEmail = getOptionalEnv("BREVO_SENDER_EMAIL");
  const senderName = getDefaultSenderName();
  const overrideRecipient = getOptionalEnv("REPORT_EMAIL_TEST_OVERRIDE");
  const mode = getEmailMode();
  const configured = Boolean(getOptionalEnv("Brevo_API_Key") && senderEmail && (mode === "live" || overrideRecipient));

  return {
    configured,
    mode,
    overrideRecipient,
    senderEmail,
    senderName,
  };
}

function buildEmailSubject(report: NormalizedUserReport) {
  if (report.role === "team_member") {
    return "Your Salt Hub adoption brief";
  }

  if (report.role === "business_owner") {
    return "Your Salt Hub team adoption brief";
  }

  return "Your Salt Hub leadership adoption brief";
}

function getActualRecipient(intendedRecipient: string | null) {
  const mode = getEmailMode();
  const overrideRecipient = getOptionalEnv("REPORT_EMAIL_TEST_OVERRIDE");

  if (mode === "test") {
    if (!overrideRecipient) {
      throw new BrevoEmailError("REPORT_EMAIL_TEST_OVERRIDE is required when REPORT_EMAIL_MODE is test.");
    }

    return {
      mode,
      actualRecipient: overrideRecipient,
      overrideRecipient,
    };
  }

  if (!intendedRecipient) {
    throw new BrevoEmailError("Report recipient email is missing.");
  }

  return {
    mode,
    actualRecipient: intendedRecipient,
    overrideRecipient: null,
  };
}

function validateReportSendability(report: NormalizedUserReport) {
  if (report.previewStatus !== "ready") {
    return `Report is not sendable because preview status is ${report.previewStatus}.`;
  }

  if (!report.recipientEmail && getEmailMode() === "live") {
    return "Report recipient email is missing.";
  }

  return null;
}

export async function sendReportEmail(report: NormalizedUserReport): Promise<EmailSendResult> {
  const skipReason = validateReportSendability(report);

  if (skipReason) {
    return {
      reportId: report.userId,
      reportName: report.userName,
      intendedRecipient: report.recipientEmail,
      actualRecipient: getOptionalEnv("REPORT_EMAIL_TEST_OVERRIDE") ?? report.recipientEmail ?? "Missing",
      subject: buildEmailSubject(report),
      messageId: null,
      status: "skipped",
      errorMessage: skipReason,
    };
  }

  const apiKey = getRequiredEnv("Brevo_API_Key");
  const senderEmail = getRequiredEnv("BREVO_SENDER_EMAIL");
  const senderName = getDefaultSenderName();
  const { actualRecipient } = getActualRecipient(report.recipientEmail);
  const subject = buildEmailSubject(report);

  const response = await fetch(BREVO_SEND_EMAIL_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: actualRecipient,
          name: report.userName,
        },
      ],
      subject,
      htmlContent: report.html,
      textContent: stripHtml(report.html),
      tags: ["salthub-report-card", report.role ?? "unknown-role"],
      headers: {
        "X-Report-User-Id": report.userId,
        "X-Intended-Recipient": report.recipientEmail ?? "missing",
      },
    }),
  });

  if (!response.ok) {
    const details = (await response.text()).trim().slice(0, 300);
    throw new BrevoEmailError(
      details
        ? `Brevo send failed with status ${response.status}. Response: ${details}`
        : `Brevo send failed with status ${response.status}.`,
      response.status,
    );
  }

  const payload = (await response.json()) as { messageId?: string | null };

  return {
    reportId: report.userId,
    reportName: report.userName,
    intendedRecipient: report.recipientEmail,
    actualRecipient,
    subject,
    messageId: payload.messageId ?? null,
    status: "sent",
    errorMessage: null,
  };
}

export { BrevoEmailError };
