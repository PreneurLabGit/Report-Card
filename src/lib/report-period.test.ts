import { describe, expect, it } from "vitest";

import {
  buildBiweeklyPeriodEnding,
  buildReportPeriod,
  buildWeekCountPeriodEnding,
  buildWeeklyPeriodEnding,
  calculatePriorPeriod,
  listIsoDatesInRange,
} from "@/lib/report-period";

describe("report periods", () => {
  it("builds a display label", () => {
    const period = buildReportPeriod("2026-06-15", "2026-06-21");

    expect(period.displayLabel).toContain("Jun");
    expect(period.startDate).toBe("2026-06-15");
  });

  it("calculates the immediately preceding equal-length range", () => {
    const period = calculatePriorPeriod("2026-06-15", "2026-06-21");

    expect(period.startDate).toBe("2026-06-08");
    expect(period.endDate).toBe("2026-06-14");
  });

  it("calculates monthly-sized manual ranges consistently", () => {
    const period = calculatePriorPeriod("2026-06-01", "2026-06-30");

    expect(period.startDate).toBe("2026-05-02");
    expect(period.endDate).toBe("2026-05-31");
  });

  it("builds a Monday-start weekly period from an end date", () => {
    const period = buildWeeklyPeriodEnding("2026-06-21");

    expect(period.startDate).toBe("2026-06-15");
    expect(period.endDate).toBe("2026-06-21");
  });

  it("builds a Monday-start bi-weekly period from an end date", () => {
    const period = buildBiweeklyPeriodEnding("2026-06-21");

    expect(period.startDate).toBe("2026-06-08");
    expect(period.endDate).toBe("2026-06-21");
  });

  it("starts a midweek weekly period on Monday of the same week", () => {
    const period = buildWeeklyPeriodEnding("2026-06-24");

    expect(period.startDate).toBe("2026-06-22");
    expect(period.endDate).toBe("2026-06-24");
  });

  it("starts a midweek bi-weekly period on the Monday of the previous week", () => {
    const period = buildBiweeklyPeriodEnding("2026-06-24");

    expect(period.startDate).toBe("2026-06-15");
    expect(period.endDate).toBe("2026-06-24");
  });

  it("derives the start date from the selected week count", () => {
    expect(buildWeekCountPeriodEnding("2026-06-24", 1).startDate).toBe("2026-06-22");
    expect(buildWeekCountPeriodEnding("2026-06-24", 2).startDate).toBe("2026-06-15");
  });

  it("lists every ISO date in a range", () => {
    expect(listIsoDatesInRange("2026-06-15", "2026-06-19")).toEqual([
      "2026-06-15",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-19",
    ]);
  });
});
