import { describe, expect, it } from "vitest";

import type { ProcessedUpload } from "@/ingestion/process-upload";
import { normalizeDataset } from "@/normalization/normalize";

describe("normalizeDataset", () => {
  it("builds enterprise totals from accepted upload types", () => {
    const processed: ProcessedUpload[] = [
      {
        kind: "action_logs",
        artifact: {
          id: "1",
          name: "action_logs.csv",
          size: 10,
          format: "csv",
          detectedKind: "action_logs",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "1",
        },
        actionLogs: [
          {
            id: "evt-1",
            user_email: "person@example.com",
            action: "created_action",
            created: "2026-06-18T00:00:00.000Z",
            payload: null,
          },
        ],
      },
      {
        kind: "department_breakdown_report",
        artifact: {
          id: "2",
          name: "department_breakdown_report.csv",
          size: 10,
          format: "csv",
          detectedKind: "department_breakdown_report",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "2",
        },
        departmentBreakdown: [
          {
            department: "Account Service",
            totalFees: 1500,
            percentOfTotal: 100,
          },
        ],
      },
    ];

    const dataset = normalizeDataset(processed);

    expect(dataset.enterpriseRollup.totalActions).toBe(1);
    expect(dataset.enterpriseRollup.totalFees).toBe(1500);
    expect(dataset.departmentRollups).toHaveLength(1);
  });
});
