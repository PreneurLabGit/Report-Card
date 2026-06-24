import { NextResponse } from "next/server";

import { buildApiReportResult } from "@/reporting/build-api-report";
import { fetchActivitySummary, fetchOrganizationTree, SaltHubApiError } from "@/lib/salthub-api";
import type { ActivitySummaryResponse, ValidationMessage } from "@/lib/domain";
import { buildBiweeklyPeriodEnding, buildWeeklyPeriodEnding, calculatePriorPeriod } from "@/lib/report-period";
import { reportGenerationRequestSchema } from "@/schemas/contracts";

function createEmptyActivitySummary(startDate: string, endDate: string): ActivitySummaryResponse {
  return {
    start_date: startDate,
    end_date: endDate,
    users: [],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = reportGenerationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Invalid request.",
        },
        { status: 400 },
      );
    }

    const weeklyPeriod = buildWeeklyPeriodEnding(parsed.data.endDate);
    const priorWeeklyPeriod = calculatePriorPeriod(weeklyPeriod.startDate, weeklyPeriod.endDate);
    const biweeklyPeriod = buildBiweeklyPeriodEnding(parsed.data.endDate);
    const priorBiweeklyPeriod = calculatePriorPeriod(biweeklyPeriod.startDate, biweeklyPeriod.endDate);

    const [organizationTree, weeklyActivity] = await Promise.all([
      fetchOrganizationTree(),
      fetchActivitySummary(weeklyPeriod.startDate, weeklyPeriod.endDate),
    ]);

    const baseWarnings: ValidationMessage[] = [];
    let includeSuperAdminReports = true;

    const [priorWeeklyActivityResult, biweeklyActivityResult, priorBiweeklyActivityResult] = await Promise.allSettled([
      fetchActivitySummary(priorWeeklyPeriod.startDate, priorWeeklyPeriod.endDate),
      fetchActivitySummary(biweeklyPeriod.startDate, biweeklyPeriod.endDate),
      fetchActivitySummary(priorBiweeklyPeriod.startDate, priorBiweeklyPeriod.endDate),
    ]);

    const priorWeeklyActivity =
      priorWeeklyActivityResult.status === "fulfilled"
        ? priorWeeklyActivityResult.value
        : createEmptyActivitySummary(priorWeeklyPeriod.startDate, priorWeeklyPeriod.endDate);

    if (priorWeeklyActivityResult.status === "rejected") {
      const message =
        priorWeeklyActivityResult.reason instanceof SaltHubApiError
          ? priorWeeklyActivityResult.reason.message
          : "Prior weekly comparison activity could not be loaded.";
      baseWarnings.push({
        level: "info",
        code: "prior_weekly_activity_unavailable",
        message: `Prior weekly comparison data was unavailable. ${message}`,
      });
    }

    const biweeklyActivity =
      biweeklyActivityResult.status === "fulfilled"
        ? biweeklyActivityResult.value
        : createEmptyActivitySummary(biweeklyPeriod.startDate, biweeklyPeriod.endDate);

    if (biweeklyActivityResult.status === "rejected") {
      includeSuperAdminReports = false;
      const message =
        biweeklyActivityResult.reason instanceof SaltHubApiError
          ? biweeklyActivityResult.reason.message
          : "Bi-weekly leadership activity could not be loaded.";
      baseWarnings.push({
        level: "warning",
        code: "biweekly_activity_unavailable",
        message: `Super Admin reports were skipped because the bi-weekly activity window could not be loaded. ${message}`,
      });
    }

    const priorBiweeklyActivity =
      priorBiweeklyActivityResult.status === "fulfilled"
        ? priorBiweeklyActivityResult.value
        : createEmptyActivitySummary(priorBiweeklyPeriod.startDate, priorBiweeklyPeriod.endDate);

    if (priorBiweeklyActivityResult.status === "rejected") {
      const message =
        priorBiweeklyActivityResult.reason instanceof SaltHubApiError
          ? priorBiweeklyActivityResult.reason.message
          : "Prior bi-weekly comparison activity could not be loaded.";
      baseWarnings.push({
        level: "info",
        code: "prior_biweekly_activity_unavailable",
        message: `Prior bi-weekly comparison data was unavailable. ${message}`,
      });
    }

    const result = await buildApiReportResult({
      weeklyPeriod,
      priorWeeklyPeriod,
      biweeklyPeriod,
      priorBiweeklyPeriod,
      organizationTree,
      weeklyActivity,
      priorWeeklyActivity,
      biweeklyActivity,
      priorBiweeklyActivity,
      includeSuperAdminReports,
      baseWarnings,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SaltHubApiError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status ?? 502 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected report generation failure.",
      },
      { status: 500 },
    );
  }
}
