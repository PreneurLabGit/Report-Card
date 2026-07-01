import { NextResponse } from "next/server";

import { buildApiReportResult } from "@/reporting/build-api-report";
import { fetchActivitySummary, fetchOrganizationTree, SaltHubApiError } from "@/lib/salthub-api";
import type { ActivitySummaryResponse, ValidationMessage, WeekCount } from "@/lib/domain";
import { buildWeekCountPeriodEnding, calculatePriorPeriod, listIsoDatesInRange } from "@/lib/report-period";
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

    const selectedWeekCount: WeekCount = parsed.data.reportOf === "super_admin" ? 2 : 1;
    const selectedPeriod = buildWeekCountPeriodEnding(parsed.data.endDate, selectedWeekCount);
    const priorSelectedPeriod = calculatePriorPeriod(selectedPeriod.startDate, selectedPeriod.endDate);

    const [organizationTree, selectedActivity] = await Promise.all([
      fetchOrganizationTree(),
      fetchActivitySummary(selectedPeriod.startDate, selectedPeriod.endDate),
    ]);

    const baseWarnings: ValidationMessage[] = [];
    const [priorSelectedActivityResult] = await Promise.allSettled([
      fetchActivitySummary(priorSelectedPeriod.startDate, priorSelectedPeriod.endDate),
    ]);
    const weekdayDates =
      parsed.data.reportOf === "team_members" ? listIsoDatesInRange(selectedPeriod.startDate, selectedPeriod.endDate) : [];
    const dailyActivityResults =
      parsed.data.reportOf === "team_members"
        ? await Promise.allSettled(weekdayDates.map((date) => fetchActivitySummary(date, date)))
        : [];

    const priorSelectedActivity =
      priorSelectedActivityResult.status === "fulfilled"
        ? priorSelectedActivityResult.value
        : createEmptyActivitySummary(priorSelectedPeriod.startDate, priorSelectedPeriod.endDate);
    const priorSelectedAvailable = priorSelectedActivityResult.status === "fulfilled";

    if (!priorSelectedAvailable) {
      const message =
        priorSelectedActivityResult.reason instanceof SaltHubApiError
          ? priorSelectedActivityResult.reason.message
          : "Prior comparison activity could not be loaded.";
      baseWarnings.push({
        level: "info",
        code: "prior_activity_unavailable",
        message: `Prior comparison data was unavailable. ${message}`,
      });
    }

    const weekdayActivitySummaries: ActivitySummaryResponse[] = [];

    if (parsed.data.reportOf === "team_members") {
      dailyActivityResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          weekdayActivitySummaries.push(result.value);
          return;
        }

        const message =
          result.reason instanceof SaltHubApiError
            ? result.reason.message
            : `Daily activity could not be loaded for ${weekdayDates[index]}.`;

        baseWarnings.push({
          level: "info",
          code: `weekday_activity_unavailable_${weekdayDates[index]}`,
          message: `Team Member daily activity lookup failed for ${weekdayDates[index]}. Available weekday lookups were still used for derivation. ${message}`,
        });
      });
    }

    const weekdayActivityAvailable =
      parsed.data.reportOf === "team_members" ? weekdayActivitySummaries.length > 0 : false;

    const result = await buildApiReportResult({
      selectedReportOf: parsed.data.reportOf,
      selectedWeekCount,
      selectedPeriod,
      weeklyPeriod: selectedPeriod,
      priorWeeklyPeriod: priorSelectedPeriod,
      biweeklyPeriod: selectedPeriod,
      priorBiweeklyPeriod: priorSelectedPeriod,
      organizationTree,
      weeklyActivity: selectedActivity,
      priorWeeklyActivity: priorSelectedActivity,
      biweeklyActivity: selectedActivity,
      priorBiweeklyActivity: priorSelectedActivity,
      includeSuperAdminReports: parsed.data.reportOf === "super_admin",
      baseWarnings,
      priorWeeklyAvailable: priorSelectedAvailable,
      priorBiweeklyAvailable: priorSelectedAvailable,
      weekdayActivitySummaries,
      weekdayActivityAvailable,
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
