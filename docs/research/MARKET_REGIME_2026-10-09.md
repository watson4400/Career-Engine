# Market Regime Brief — 2026-10-09

**As-of (UTC):** 2026-10-09T11:49:04Z  
**Primary data pulls:** CoinGecko Global + Markets, DefiLlama fees/TVL/stablecoins, Alternative.me Fear & Greed  
**Secondary dated reports:** CharlieDesk 2026-10-05; CoinDesk 2026-10-02; CryptoBriefing ETH OI; Cryptonomist unlocks 2026-10-05  
**Labeling:** `MEASURED` = API/primary number; `REPORTED` = third-party article citing a dataset; `ESTIMATE` = our derivation; `SPECULATION` = unconfirmed narrative.

---

## 1. Regime call

**Primary regime (code enum):** `trending` with **late-cycle leverage risk** — not `crisis`.  
**Secondary tag (ops, not Jev enum):** `selective_risk_on_btc_led`.

| Signal | Value | Label | Source |
| --- | --- | --- | --- |
| BTC price | $83,243 | MEASURED | CoinGecko markets 2026-10-09 |
| ETH price | $2,507.66 | MEASURED | CoinGecko markets 2026-10-09 |
| BTC 30d / 90d | +6.5% / +30.7% | MEASURED | CoinGecko market_chart |
| ETH 30d / 90d | +1.7% / +40.4% | MEASURED | CoinGecko market_chart |
| BTC 7d | −4.5% | MEASURED | CoinGecko |
| ETH 7d | −9.3% | MEASURED | CoinGecko |
| Total crypto mcap | ~$2.79T | MEASURED | CoinGecko global |
| Mcap 24h change | −3.96% | MEASURED | CoinGecko global |
| BTC dominance | 59.70% | MEASURED | CoinGecko global |
| ETH dominance | 10.94% | MEASURED | CoinGecko global |
| Fear & Greed | 59 Greed | MEASURED | Alternative.me (ts 1791504000) |
| USDT circ. | ~$184.1B | MEASURED | DefiLlama stablecoins |
| USDC circ. | ~$73.1B | MEASURED | DefiLlama stablecoins |
| USDe circ. | ~$4.80B | MEASURED | DefiLlama stablecoins |
| BTC funding (Oct 5) | 7.6% p.a. | REPORTED | CharlieDesk 2026-10-05 |
| ETH funding (Oct 5) | 11.0% p.a. | REPORTED | CharlieDesk 2026-10-05 |
| BTC OI jump | +$2.3B / ~653k BTC | REPORTED | CoinDesk 2026-10-02 (CoinGlass) |
| ETH OI | down 11.7% to ~12.49M ETH | REPORTED | CryptoBriefing (late Sep–early Oct) |
| Spot ETF flows | +$190M day / +$566M 7d | REPORTED | CharlieDesk 2026-10-05 |
| VIX | ~15.3 | REPORTED | CharlieDesk 2026-10-05 |
| 10y yield | 5.23% | REPORTED | CharlieDesk 2026-10-05 |

**Interpretation (ESTIMATE):** Medium-term trend still up (90d), but the last week is a pullback with BTC dominance elevated (~60%). Capital is preferring BTC over broad alts. Stablecoin dry powder remains large (USDT+USDC ≈ $257B). Leverage rebuilt into early October; ETH derivatives positioning weakened relative to BTC.

**Why not `crisis`:** No systemic depeg in top stables; equity vol calm (VIX ~15); drawdowns are weekly, not cascading.

**Why not pure `mean_reverting`:** 90d trend and ETF inflows still define the tape; mean-reversion tactics are secondary until BTC loses the recent range.

**Binance futures note:** Direct Binance Futures REST from this host returned geo-restriction errors (2026-10-09). Live loop must use an allowed venue adapter or relay; funding/OI for live gates use CharlieDesk/CoinGlass-class feeds or Bybit/OKX when configured.

---

## 2. Macro & narrative rotation

| Theme | State | Label |
| --- | --- | --- |
| Fed / rates | FOMC 2026-10-28 on calendar; 10y still elevated (~5.23%) | REPORTED schedule / yield |
| CPI / PPI | CPI 10/14, PPI 10/15 | REPORTED |
| BTC-led risk | Dominance → ~60%; USDT share slipped earlier in week | REPORTED + MEASURED dom |
| Perps venues | Hyperliquid perps fees ~$3.0M/24h | MEASURED DefiLlama fees |
| Solana meme/launch | PumpSwap + pump.fun still high fee printers | MEASURED fees |
| Yield / PT looping | Pendle×Aave AUSD maturity rollover Oct 8 → Dec 17 | REPORTED CryptoSlate / CryptoBriefing |
| AI / infra | TAO/NEAR/RENDER still narrative-sensitive; NEAR +95% 30d | MEASURED price; SPECULATION on persistence |

---

## 3. Fee / TVL anchors (value-accrual screen)

| Protocol | 24h fees | TVL (approx) | Token accrual note |
| --- | --- | --- | --- |
| Hyperliquid Perps | ~$3.02M | Bridge TVL ~$6.9B | MEASURED fees/TVL; HYPE capture via assistance fund / buybacks — confirm current policy before sizing |
| Ethena USDe | ~$3.29M | USDe ~$4.80B | Fees from basis; ENA governance — value accrual **indirect** |
| Uniswap V3+V4 | ~$3.64M combined | V3+V4 TVL ~$2.9B | Fee switch historically off for UNI — **weak token accrual** unless activated |
| Aave V3 | ~$1.47M | ~$17.3B | AAVE via safety module / governance — partial |
| Lido | ~$1.67M | ~$24.3B | LDO weak claim on staking spread |
| Pendle V2 | (not top-30 fees today) | ~$1.21B TVL | Product-market fit in rates; token value = fee share / incentives mix — verify |

---

## 4. Operator implications for the agent

1. Default **long bias only in `trending` + `risk_state=safe`**, prefer BTC beta and fee-rich venues with clear token accrual.
2. Treat **ETH leverage crowding** (Oct 5 funding 11% p.a., crowd long ~70%) as toxic-flow risk for ETH alts.
3. Unlock week (HYPE/ENA early Oct) → widen spreads / cut size; do not fade unlocks blindly if OTC-absorbed (HYPE institutional buyer — REPORTED).
4. Hard risk layer owns DD/position/daily loss; Jev never overrides.
5. Paper mode until operator flips `LIVE_TRADING=true` and disarms kill switch intentionally.
