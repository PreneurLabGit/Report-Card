import { describe, expect, it } from "vitest";

import { detectCsvKind, detectFormat } from "@/ingestion/detect";

describe("detectCsvKind", () => {
  it("detects action logs by headers", () => {
    expect(detectCsvKind("anything.csv", ["id", "user_email", "action", "created", "payload"])).toBe("action_logs");
  });

  it("detects client summary by headers", () => {
    expect(detectCsvKind("clients.csv", ["Client", "Total Projects", "Total Fees", "Total Revenue"])).toBe(
      "client_summary_report",
    );
  });
});

describe("detectFormat", () => {
  it("detects excel uploads", () => {
    expect(detectFormat("action_logs.xlsx")).toBe("excel");
  });

  it("treats json as unsupported in the first-use flow", () => {
    expect(detectFormat("feed.json")).toBe("unknown");
  });
});
