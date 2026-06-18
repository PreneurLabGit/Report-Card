import { describe, expect, it } from "vitest";

import { detectCsvKind, detectJsonKind } from "@/ingestion/detect";

describe("detectCsvKind", () => {
  it("detects action logs by headers", () => {
    expect(detectCsvKind("anything.csv", ["id", "user_email", "action", "created", "payload"])).toBe("action_logs");
  });
});

describe("detectJsonKind", () => {
  it("detects analytics payload shape", () => {
    expect(detectJsonKind({ users: [], summary: {} })).toBe("analytics_payload");
  });
});
