import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { envForOps, type OpsConfig } from "./ops-config.js";

export interface RunnerState {
  running: boolean;
  sessionId: string | null;
  startedAt: string | null;
  pid: number | null;
  lastExitCode: number | null;
  lastError: string | null;
  log: string[];
}

const MAX_LOG = 80;

export class SessionRunner {
  private child: ChildProcess | null = null;
  private sessionId: string | null = null;
  private startedAt: string | null = null;
  private lastExitCode: number | null = null;
  private lastError: string | null = null;
  private log: string[] = [];

  constructor(private readonly root: string) {}

  state(): RunnerState {
    return {
      running: Boolean(this.child && !this.child.killed && this.child.exitCode == null),
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      pid: this.child?.pid ?? null,
      lastExitCode: this.lastExitCode,
      lastError: this.lastError,
      log: [...this.log],
    };
  }

  start(cfg: OpsConfig): RunnerState {
    if (this.state().running) {
      this.lastError = "Already running";
      return this.state();
    }
    this.lastError = null;
    this.lastExitCode = null;
    this.log = [];
    this.sessionId = `cb-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    this.startedAt = new Date().toISOString();

    const script = join(this.root, "src/cli/live-coinbase.ts");
    const tsxCli = join(this.root, "node_modules/tsx/dist/cli.mjs");
    const child = spawn(process.execPath, [tsxCli, script], {
      cwd: this.root,
      env: envForOps(cfg),
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.child = child;

    const push = (chunk: Buffer, stream: "out" | "err") => {
      const text = chunk.toString("utf8").trim();
      if (!text) return;
      for (const line of text.split("\n")) {
        this.log.push(`${stream === "err" ? "!" : "·"} ${line.slice(0, 240)}`);
      }
      if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
    };
    child.stdout?.on("data", (c) => push(c, "out"));
    child.stderr?.on("data", (c) => push(c, "err"));
    child.on("error", (e) => {
      this.lastError = String(e.message ?? e);
      this.child = null;
    });
    child.on("exit", (code) => {
      this.lastExitCode = code;
      if (code && code !== 0) this.lastError = `Session exited ${code}`;
      this.pushLine(`· session ended (code ${code ?? "?"})`);
      this.child = null;
    });
    this.pushLine(`· started ${cfg.productId} · ${cfg.dryRun ? "dry-run" : "LIVE"} · ${cfg.candles} candles`);
    return this.state();
  }

  stop(): RunnerState {
    if (!this.child) {
      this.lastError = null;
      return this.state();
    }
    this.pushLine("· stop requested");
    this.child.kill("SIGTERM");
    const c = this.child;
    setTimeout(() => {
      if (c.exitCode == null && !c.killed) c.kill("SIGKILL");
    }, 2500).unref?.();
    return this.state();
  }

  private pushLine(line: string) {
    this.log.push(line);
    if (this.log.length > MAX_LOG) this.log = this.log.slice(-MAX_LOG);
  }
}
