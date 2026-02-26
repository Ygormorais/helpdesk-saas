import { describe, expect, it } from "vitest";
import { makeClient } from "./index.js";

describe("client", () => {
  it("creates a client", () => {
    const c = makeClient({ baseUrl: "http://localhost:4010" });
    expect(c).toBeTruthy();
  });
});
