import { describe, expect, it } from "vitest";

import { buildFrictionRollups, rankFrictionThemes } from "@/derivation/friction";
import type { RawFrictionNote } from "@/lib/domain";

const notes: RawFrictionNote[] = [
  {
    noteId: "fn_001",
    managerId: "mgr_123",
    managerName: "Jordan Lee",
    managerEmail: "jordan@example.com",
    team: "Account Team",
    leaderId: "ldr_001",
    leaderName: "Maya Patel",
    department: "Account Service",
    submittedAt: "2026-06-15T10:30:00Z",
    reportingPeriodStart: "2026-06-08",
    reportingPeriodEnd: "2026-06-14",
    noteText: "The workback builder feels harder than a spreadsheet for medium-complexity projects.",
  },
  {
    noteId: "fn_002",
    managerId: "mgr_456",
    managerName: "Taylor Reed",
    managerEmail: "taylor@example.com",
    team: "Growth Team",
    leaderId: "ldr_001",
    leaderName: "Maya Patel",
    department: "Account Service",
    submittedAt: "2026-06-16T10:30:00Z",
    reportingPeriodStart: "2026-06-08",
    reportingPeriodEnd: "2026-06-14",
    noteText: "The workflow builder is harder than a spreadsheet and slows planning.",
  },
];

describe("rankFrictionThemes", () => {
  it("ranks repeated themes by repeated mention breadth", () => {
    const themes = rankFrictionThemes(notes);

    expect(themes[0]?.classification).toBe("Platform");
    expect(themes[0]?.distinctManagerCount).toBe(2);
  });
});

describe("buildFrictionRollups", () => {
  it("groups notes by leader and department", () => {
    const rollups = buildFrictionRollups(notes);

    expect(rollups.byLeaderId["ldr_001"]).toHaveLength(2);
    expect(rollups.byDepartment["Account Service"]).toHaveLength(2);
  });
});
