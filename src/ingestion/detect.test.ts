import { describe, expect, it } from "vitest";

import { detectCsvKind, detectJsonKind } from "@/ingestion/detect";

describe("detectCsvKind", () => {
  it("detects action logs by headers", () => {
    expect(detectCsvKind("anything.csv", ["id", "user_email", "action", "created", "payload"])).toBe("action_logs");
  });

  it("detects friction notes by headers", () => {
    expect(
      detectCsvKind("weekly.csv", [
        "note_id",
        "manager_id",
        "manager_name",
        "manager_email",
        "team",
        "leader_id",
        "leader_name",
        "department",
        "submitted_at",
        "reporting_period_start",
        "reporting_period_end",
        "note_text",
      ]),
    ).toBe("friction_notes");
  });
});

describe("detectJsonKind", () => {
  it("detects analytics payload shape", () => {
    expect(detectJsonKind({ users: [], summary: {} })).toBe("analytics_payload");
  });

  it("detects friction note json shape", () => {
    expect(detectJsonKind({ friction_notes: [] })).toBe("friction_notes");
  });
});
