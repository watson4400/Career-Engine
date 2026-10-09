import { describe, expect, it } from "vitest";
import { maxSpreadBpsForSymbol } from "../../src/config/constants.js";
import { resolveSchemaId, schemaForProduct } from "../../src/jev/schemas.js";

describe("schemaForProduct", () => {
  it("maps liquid Coinbase products to finalist sleeves", () => {
    expect(schemaForProduct("SOL-USD").id).toBe("sol_fee_beta");
    expect(schemaForProduct("LINK-USD").id).toBe("link_infra_fees");
    expect(schemaForProduct("AAVEUSDT").id).toBe("aave_tvl_fees");
    expect(schemaForProduct("BTC-USD").id).toBe("btc_regime_beta");
  });

  it("resolveSchemaId prefers explicit then env product", () => {
    expect(resolveSchemaId({ schemaId: "link_infra_fees", productId: "SOL-USD" })).toBe(
      "link_infra_fees",
    );
    expect(resolveSchemaId({ productId: "SOL-USD" })).toBe("sol_fee_beta");
  });
});

describe("maxSpreadBpsForSymbol", () => {
  it("gives alts more room than BTC", () => {
    expect(maxSpreadBpsForSymbol("BTC-USD")).toBe(25);
    expect(maxSpreadBpsForSymbol("SOLUSDT")).toBe(60);
  });
});
