import { describe, expect, it } from "vitest";

import {
  calculateBusinessOwnerScore,
  calculateSuperAdminScore,
  calculateTeamMemberScore,
  getScoreStatus,
  hasMeaningfulActivity,
  type ScoreMetrics,
} from "@/lib/scoring";

const maxMetrics: ScoreMetrics = {
  loginCount: 8,
  pipelineEntriesCreated: 8,
  estimatesCreated: 8,
  estimatesSubmitted: 4,
  sentForBusinessOwnerApproval: 2,
  firstApprovals: 4,
  approvalsCompleted: 4,
  clientApprovals: 2,
  projectsConfirmed: 2,
  reworkEvents: 0,
};

const zeroMetrics: ScoreMetrics = {
  loginCount: 0,
  pipelineEntriesCreated: 0,
  estimatesCreated: 0,
  estimatesSubmitted: 0,
  sentForBusinessOwnerApproval: 0,
  firstApprovals: 0,
  approvalsCompleted: 0,
  clientApprovals: 0,
  projectsConfirmed: 0,
  reworkEvents: 0,
};

describe("scoring", () => {
  it("treats all-zero metrics as no meaningful activity", () => {
    expect(hasMeaningfulActivity(zeroMetrics)).toBe(false);
  });

  it("scores a no-activity team member as 0", () => {
    expect(calculateTeamMemberScore(zeroMetrics)).toBe(0);
  });

  it("scores a strong team member near the top of the range", () => {
    expect(calculateTeamMemberScore(maxMetrics)).toBe(100);
  });

  it("scores a strong business owner rollup at the top of the range", () => {
    expect(
      calculateBusinessOwnerScore({
        eligibleChildCount: 1,
        activeChildMetrics: [maxMetrics],
        aggregateMetrics: maxMetrics,
      }),
    ).toBe(100);
  });

  it("scores a strong super admin rollup at the top of the range", () => {
    expect(
      calculateSuperAdminScore({
        eligibleBusinessOwnerCount: 1,
        activeBusinessOwnerCount: 1,
        businessOwnerScores: [100],
        aggregateMetrics: maxMetrics,
      }),
    ).toBe(100);
  });

  it("derives color bands and labels from score and delta", () => {
    expect(getScoreStatus(maxMetrics, 92, 80)).toEqual({
      color: "green",
      label: "Trending up",
    });
    expect(getScoreStatus(zeroMetrics, 55, 70)).toEqual({
      color: "red",
      label: "Stuck",
    });
    expect(getScoreStatus(maxMetrics, 68, 68)).toEqual({
      color: "yellow",
      label: "Holding",
    });
  });
});
