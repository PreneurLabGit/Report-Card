import { describe, expect, it } from "vitest";

import type { ProcessedUpload } from "@/ingestion/process-upload";
import { normalizeDataset } from "@/normalization/normalize";
import { buildSimpleReport } from "@/reporting/build-simple-report";

describe("buildSimpleReport", () => {
  it("builds a simple report from action logs and project exports", () => {
    const uploads: ProcessedUpload[] = [
      {
        kind: "action_logs",
        artifact: {
          id: "1",
          name: "action_logs.csv",
          size: 100,
          format: "csv",
          detectedKind: "action_logs",
          status: "validated",
          messages: [],
          rowCount: 2,
          hash: "hash-1",
        },
        actionLogs: [
          { id: "a1", user_email: "user@example.com", action: "created_project", created: "2026-06-18T12:00:00Z", payload: null },
          { id: "a2", user_email: "user@example.com", action: "created_project", created: "2026-06-19T12:00:00Z", payload: null },
        ],
      },
      {
        kind: "project_fees_by_department_by_month",
        artifact: {
          id: "2",
          name: "project_fees_by_department_by_month.csv",
          size: 100,
          format: "csv",
          detectedKind: "project_fees_by_department_by_month",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "hash-2",
        },
        projectFeesByDepartment: [
          {
            projectCode: "P1",
            client: "Acme",
            programName: "Launch",
            startMonth: "2026-05",
            endMonth: "2026-06",
            status: "Active",
            totalFees: 12000,
            departmentFees: { Delivery: 7000, Design: 5000 },
          },
        ],
      },
    ];

    const report = buildSimpleReport(normalizeDataset(uploads));

    expect(report.summaryCards[0]?.value).toBe("2");
    expect(report.sections[0]?.title).toBe("Action log summary");
    expect(report.sections[1]?.bullets[1]).toContain("dynamic department allocation columns");
  });
});
