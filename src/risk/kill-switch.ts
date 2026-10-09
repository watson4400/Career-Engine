import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_PATH = process.env.KILL_SWITCH_PATH ?? "data/sessions/kill-switch.json";

export interface KillSwitchState {
  armed: boolean;
  reason: string;
  updatedAt: string;
}

export class KillSwitch {
  constructor(private readonly path: string = DEFAULT_PATH) {}

  read(): KillSwitchState {
    if (!existsSync(this.path)) {
      return { armed: true, reason: "default-armed-until-operator", updatedAt: new Date(0).toISOString() };
    }
    return JSON.parse(readFileSync(this.path, "utf8")) as KillSwitchState;
  }

  /** armed=true means BLOCK orders. */
  arm(reason: string): void {
    this.write({ armed: true, reason, updatedAt: new Date().toISOString() });
  }

  disarm(reason: string): void {
    this.write({ armed: false, reason, updatedAt: new Date().toISOString() });
  }

  isBlocking(): boolean {
    return this.read().armed;
  }

  private write(state: KillSwitchState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(state, null, 2));
  }
}
