import { describe, expect, it } from "vitest";
import { JOB_TYPES, isJobType } from "./jobs.js";

describe("jobs", () => {
  it("has at least one job type", () => {
    expect(JOB_TYPES.length).toBeGreaterThan(0);
  });

  it("isJobType recognizes valid types", () => {
    for (const t of JOB_TYPES) {
      expect(isJobType(t)).toBe(true);
    }
    expect(isJobType("nope")).toBe(false);
  });
});
