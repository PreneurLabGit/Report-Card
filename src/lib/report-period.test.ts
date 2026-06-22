import { describe, expect, it } from "vitest";

import { buildReportPeriod, calculatePriorPeriod } from "@/lib/report-period";

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
});
