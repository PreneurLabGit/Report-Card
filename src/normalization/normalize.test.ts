import { describe, expect, it } from "vitest";

import type { ProcessedUpload } from "@/ingestion/process-upload";
import { normalizeDataset } from "@/normalization/normalize";

describe("normalizeDataset", () => {
  it("builds enterprise totals and users", () => {
    const processed: ProcessedUpload[] = [
      {
        kind: "user_directory",
        artifact: {
          id: "1",
          name: "users.json",
          size: 10,
          format: "json",
          detectedKind: "user_directory",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "1",
        },
        userDirectory: [{ email: "person@example.com", name: "Person Example", role: "Manager" }],
      },
      {
        kind: "action_logs",
        artifact: {
          id: "2",
          name: "action_logs.csv",
          size: 10,
          format: "csv",
          detectedKind: "action_logs",
          status: "validated",
          messages: [],
          rowCount: 1,
          hash: "2",
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
    ];

    const dataset = normalizeDataset(processed);

    expect(dataset.userDirectory).toHaveLength(1);
    expect(dataset.enterpriseRollup.totalActions).toBe(1);
    expect(dataset.individualMetrics[0]?.activityCount).toBe(1);
  });
});
