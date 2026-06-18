import { describe, expect, it } from "vitest";

import type { ProcessedUpload } from "@/ingestion/process-upload";
import { normalizeDataset } from "@/normalization/normalize";
import { buildReportViewModel } from "@/reporting/build-report";

describe("buildReportViewModel", () => {
  it("builds an ELT report", () => {
    const processed: ProcessedUpload[] = [
      {
        kind: "department_breakdown_report",
        artifact: {
          id: "3",
          name: "department_breakdown_report.csv",
          size: 10,
          format: "csv",
          detectedKind: "department_breakdown_report",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "3",
        },
        departmentBreakdown: [{ department: "Operations", totalFees: 22000, percentOfTotal: 55 }],
      },
    ];

    const dataset = normalizeDataset(processed);
    const report = buildReportViewModel(dataset, {
      id: "elt:enterprise",
      audience: "elt",
      label: "Enterprise leadership team",
      subjectId: "enterprise",
    });

    expect(report.audience).toBe("elt");
    expect(report.metrics[0]?.label).toBe("Total fees");
  });
});
