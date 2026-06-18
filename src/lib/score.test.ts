import { describe, expect, it } from "vitest";

import { getScoreBand } from "@/lib/score";

describe("getScoreBand", () => {
  it("assigns green for scores at least 80", () => {
    expect(getScoreBand(80).band).toBe("green");
  });

  it("assigns yellow for scores between 60 and 79", () => {
    expect(getScoreBand(72).band).toBe("yellow");
  });

  it("assigns red for scores below 60", () => {
    expect(getScoreBand(15).band).toBe("red");
  });
});
