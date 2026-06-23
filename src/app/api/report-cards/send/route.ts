import { NextResponse } from "next/server";

import type { EmailSendResponse } from "@/lib/domain";
import { BrevoEmailError, getEmailDeliveryConfigSummary, sendReportEmail } from "@/lib/brevo";
import { reportSendRequestSchema } from "@/schemas/contracts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reportSendRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid send request.",
        },
        { status: 400 },
      );
    }

    const config = getEmailDeliveryConfigSummary();

    if (!config.configured) {
      return NextResponse.json(
        {
          error: "Email sending is not fully configured. Check Brevo and sender environment variables.",
        },
        { status: 400 },
      );
    }

    const results = [];

    for (const report of parsed.data.reports) {
      try {
        results.push(await sendReportEmail(report));
      } catch (error) {
        results.push({
          reportId: report.userId,
          reportName: report.userName,
          intendedRecipient: report.recipientEmail,
          actualRecipient: config.overrideRecipient ?? report.recipientEmail ?? "Missing",
          subject:
            report.role === "team_member"
              ? "Your Salt Hub adoption brief"
              : report.role === "business_owner"
                ? "Your Salt Hub team adoption brief"
                : "Your Salt Hub leadership adoption brief",
          messageId: null,
          status: "failed" as const,
          errorMessage: error instanceof Error ? error.message : "Unexpected email send failure.",
        });
      }
    }

    const response: EmailSendResponse = {
      mode: config.mode,
      overrideRecipient: config.overrideRecipient,
      sentCount: results.filter((result) => result.status === "sent").length,
      failedCount: results.filter((result) => result.status === "failed").length,
      skippedCount: results.filter((result) => result.status === "skipped").length,
      results,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof BrevoEmailError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status ?? 502 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected email send failure.",
      },
      { status: 500 },
    );
  }
}
