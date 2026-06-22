import { NextResponse } from "next/server";

import { buildApiReportResult } from "@/reporting/build-api-report";
import { fetchActivitySummary, fetchOrganizationTree, SaltHubApiError } from "@/lib/salthub-api";
import { calculatePriorPeriod } from "@/lib/report-period";
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

    const priorPeriod = calculatePriorPeriod(parsed.data.startDate, parsed.data.endDate);
    const organizationTree = await fetchOrganizationTree();
    const currentActivity = await fetchActivitySummary(parsed.data.startDate, parsed.data.endDate);
    const priorActivity = await fetchActivitySummary(priorPeriod.startDate, priorPeriod.endDate);

    const result = await buildApiReportResult({
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      organizationTree,
      currentActivity,
      priorActivity,
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
