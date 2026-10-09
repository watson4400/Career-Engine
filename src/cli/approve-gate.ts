import { readFileSync, writeFileSync } from "node:fs";

/** Operator tool: node --import tsx src/cli/approve-gate.ts 01-spec alice */
const [gate, who] = process.argv.slice(2);
if (!gate || !who) {
  console.error("Usage: approve-gate <01-spec|02-architecture|...> <operator>");
  process.exit(1);
}
const path = `.agenkit/gates/${gate}.gate.json`;
const json = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
json.approved = true;
json.approved_by = who;
json.approved_at = new Date().toISOString();
writeFileSync(path, JSON.stringify(json, null, 2) + "\n");
console.log(`Approved ${path} by ${who}`);
