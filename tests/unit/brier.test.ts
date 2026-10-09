import { describe, expect, it } from "vitest";
import { brierScore } from "../../src/review/brier.js";

describe("brier", () => {
  it("is 0 for perfect forecasts", () => {
    expect(
      brierScore([
        { id: "1", schemaId: "x", tsMs: 1, p: 1, outcome: 1 },
        { id: "2", schemaId: "x", tsMs: 2, p: 0, outcome: 0 },
      ]),
    ).toBe(0);
  });

  it("is 0.25 for coin-flip on 50/50", () => {
    expect(
      brierScore([
        { id: "1", schemaId: "x", tsMs: 1, p: 0.5, outcome: 1 },
        { id: "2", schemaId: "x", tsMs: 2, p: 0.5, outcome: 0 },
      ]),
    ).toBe(0.25);
  });
});
