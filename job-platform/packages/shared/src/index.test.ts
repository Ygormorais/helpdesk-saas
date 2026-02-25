import { describe, expect, it } from "vitest";
import { getEnvOptional } from "./env.js";

describe("shared", () => {
  it("getEnvOptional returns undefined when missing", () => {
    expect(getEnvOptional("__MISSING_ENV__")).toBeUndefined();
  });
});
