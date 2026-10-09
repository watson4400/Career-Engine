import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { JevDecision, MarketSnapshot } from "../types/index.js";

export interface EscalationEvent {
  ts: string;
  reason: string;
  snapshot: MarketSnapshot;
  decision: JevDecision;
}

/**
 * Brain escalation hook — persists a deep re-read request for Opus.
 * Cheap Jev by default; heavy reasoning only when confidence/regime demands it.
 */
export function escalateToBrain(
  reason: string,
  snapshot: MarketSnapshot,
  decision: JevDecision,
  path = "data/sessions/escalations.jsonl",
): EscalationEvent {
  const event: EscalationEvent = {
    ts: new Date().toISOString(),
    reason,
    snapshot,
    decision,
  };
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(event) + "\n");
  return event;
}
