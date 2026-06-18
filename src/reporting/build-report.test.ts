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
      {
        kind: "friction_notes",
        artifact: {
          id: "4",
          name: "friction_notes.csv",
          size: 10,
          format: "csv",
          detectedKind: "friction_notes",
          status: "validated",
          messages: [],
          rowCount: 2,
          hash: "4",
        },
        frictionNotes: [
          {
            noteId: "fn_001",
            managerId: "mgr_123",
            managerName: "Jordan Lee",
            managerEmail: "jordan@example.com",
            team: "Account Team",
            leaderId: "ldr_001",
            leaderName: "Maya Patel",
            department: "Operations",
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
            department: "Operations",
            submittedAt: "2026-06-16T10:30:00Z",
            reportingPeriodStart: "2026-06-08",
            reportingPeriodEnd: "2026-06-14",
            noteText: "The workflow builder is harder than a spreadsheet and slows planning.",
          },
        ],
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
    expect(report.sections.some((section) => section.title === "Decisions and asks")).toBe(true);
    expect(report.sections.every((section) => !section.body.includes("@example.com"))).toBe(true);
  });
});
