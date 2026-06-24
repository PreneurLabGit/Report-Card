import { NextResponse } from "next/server";

import { buildApiReportResult } from "@/reporting/build-api-report";
import { fetchActivitySummary, fetchOrganizationTree, SaltHubApiError } from "@/lib/salthub-api";
import { buildBiweeklyPeriodEnding, buildWeeklyPeriodEnding, calculatePriorPeriod } from "@/lib/report-period";
import { reportGenerationRequestSchema } from "@/schemas/contracts";

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
    const [organizationTree, weeklyActivity, priorWeeklyActivity, biweeklyActivity, priorBiweeklyActivity] = await Promise.all([
      fetchOrganizationTree(),
      fetchActivitySummary(weeklyPeriod.startDate, weeklyPeriod.endDate),
      fetchActivitySummary(priorWeeklyPeriod.startDate, priorWeeklyPeriod.endDate),
      fetchActivitySummary(biweeklyPeriod.startDate, biweeklyPeriod.endDate),
      fetchActivitySummary(priorBiweeklyPeriod.startDate, priorBiweeklyPeriod.endDate),
    ]);

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
