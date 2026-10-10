const $ = (id) => document.getElementById(id);

let state = null;
let selectedId = null;
let lastEquity = null;
let busy = false;

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n) * 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function fmtPnl(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${fmtMoney(Math.abs(v))}`;
}

function pnlClass(n) {
  if (n == null || Number.isNaN(Number(n)) || Number(n) === 0) return "";
  return Number(n) > 0 ? "up" : "down";
}

function sessionPnl(s) {
  const summary = s.summary ?? s;
  const result = summary?.result ?? summary;
  let pnlPct = s.pnlPct ?? result?.pnlPct ?? summary?.pnlPct;
  let pnlUsd = s.pnlUsd ?? result?.pnlUsd ?? summary?.pnlUsd;
  const equity = s.equity ?? result?.equity ?? summary?.equity;
  const start = s.startingEquity ?? result?.startingEquity ?? summary?.startingEquity;
  if (pnlUsd == null && equity != null && start != null) pnlUsd = Number(equity) - Number(start);
  if (pnlPct == null && equity != null && start != null && Number(start) > 0) {
    pnlPct = (Number(equity) - Number(start)) / Number(start);
  }
  return { pnlPct, pnlUsd };
}

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function renderProducts(consoleData) {
  const row = $("products");
  row.innerHTML = "";
  for (const p of consoleData.products) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "product" + (p.id === consoleData.config.productId ? " active" : "");
    btn.innerHTML = `<strong>${p.label}</strong><small>${p.blurb}</small>`;
    btn.disabled = Boolean(consoleData.runner?.running);
    btn.addEventListener("click", async () => {
      if (busy || consoleData.runner?.running) return;
      busy = true;
      try {
        const data = await api("/api/control/config", {
          method: "POST",
          body: JSON.stringify({ productId: p.id }),
        });
        paint(data.console);
      } catch (e) {
        alert(String(e.message || e));
      } finally {
        busy = false;
      }
    });
    row.append(btn);
  }
}

function renderDecision(consoleData) {
  const d = consoleData.decision;
  const hero = document.querySelector(".hero-copy");
  hero.classList.remove("tone-go", "tone-wait", "tone-warn", "tone-danger");
  hero.classList.add(`tone-${d.tone}`);
  $("decision-tone").textContent =
    d.tone === "go" ? "Go" : d.tone === "danger" ? "Risk" : d.tone === "warn" ? "Blocked" : "Wait";
  $("decision-title").textContent = d.title;
  $("decision-detail").textContent = d.detail;

  const primary = $("btn-primary");
  const stop = $("btn-stop");
  const running = Boolean(consoleData.runner?.running);

  stop.hidden = !running;
  if (running) {
    primary.hidden = true;
    stop.onclick = () => controlStop();
  } else {
    primary.hidden = false;
    if (d.primaryAction === "run") {
      primary.textContent = consoleData.config.dryRun ? "Run dry session" : "Run LIVE session";
      primary.className = "btn " + (consoleData.config.dryRun ? "primary" : "danger");
      primary.disabled = false;
      primary.onclick = () => controlRun();
    } else if (d.primaryAction === "disarm_kill") {
      primary.textContent = "Disarm kill switch";
      primary.className = "btn primary";
      primary.disabled = false;
      primary.onclick = () => setKill(false);
    } else if (d.primaryAction === "fix_keys") {
      primary.textContent = "Retry connection";
      primary.className = "btn primary";
      primary.disabled = false;
      primary.onclick = () => refresh();
    } else {
      primary.textContent = "Waiting…";
      primary.className = "btn ghost";
      primary.disabled = true;
      primary.onclick = null;
    }
  }
}

function renderEquity(consoleData) {
  const book = consoleData.book;
  if (book?.ok && book.liveEquity != null) {
    lastEquity = book.liveEquity;
    $("equity").textContent = `$${fmtMoney(book.liveEquity)}`;
    const bal = (book.balances || [])
      .map((b) => `${b.currency} ${fmtMoney(b.total ?? b.available)}`)
      .join(" · ");
    $("equity-sub").textContent = bal || `cash $${fmtMoney(book.liveCash)}`;
    const spread =
      book.spreadBps != null
        ? `spread ${Number(book.spreadBps).toFixed(1)} bps${book.spreadOk === false ? " · wide" : ""}`
        : "";
    $("mid-line").textContent = `${book.productId} mid $${fmtMoney(book.mid)}${spread ? " · " + spread : ""}`;
  } else if (lastEquity != null) {
    $("equity").textContent = `$${fmtMoney(lastEquity)}`;
    $("equity-sub").textContent = book?.error
      ? `stale · ${String(book.error).slice(0, 70)}`
      : "stale · last good (not $0)";
    $("mid-line").textContent = "—";
  } else {
    $("equity").textContent = "—";
    $("equity-sub").textContent = book?.error
      ? `not loaded · ${String(book.error).slice(0, 80)}`
      : "not loaded · not $0";
    $("mid-line").textContent = "—";
  }
}

function renderStrip(consoleData) {
  const latest = consoleData.latest;
  const running = consoleData.runner?.running;
  $("stat-mode").textContent = running
    ? consoleData.config.dryRun
      ? "dry-run · live"
      : "LIVE · running"
    : latest?.mode ?? "idle";
  if (latest) {
    const { pnlUsd, pnlPct } = sessionPnl(latest);
    const el = $("stat-pnl");
    el.textContent = `${fmtPnl(pnlUsd)} (${fmtPct(pnlPct)})`;
    el.className = `mono ${pnlClass(pnlUsd ?? pnlPct)}`;
    $("stat-orders").textContent = `${latest.orders ?? "—"} / ${latest.holds ?? "—"}`;
  } else {
    $("stat-pnl").textContent = "—";
    $("stat-pnl").className = "mono";
    $("stat-orders").textContent = "—";
  }
  $("stat-dry").textContent = String(consoleData.drySessionCount ?? 0);
}

function renderSessions(consoleData) {
  const sessions = consoleData.sessions || [];
  $("session-count").textContent = String(consoleData.sessionCount ?? sessions.length);
  const ul = $("session-list");
  ul.innerHTML = "";
  for (const s of sessions.slice(0, 24)) {
    const li = document.createElement("li");
    if (s.id === selectedId) li.classList.add("active");
    const { pnlUsd, pnlPct } = sessionPnl(s);
    const pnlBit =
      pnlUsd != null ? ` · ${fmtPnl(pnlUsd)} (${fmtPct(pnlPct)})` : pnlPct != null ? ` · ${fmtPct(pnlPct)}` : "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<div class="sid">${s.id}</div><div class="muted">${s.productId ?? s.mode ?? "—"} · orders ${s.orders ?? 0}${pnlBit}</div>`;
    btn.addEventListener("click", () => {
      selectedId = s.id;
      loadTape(s.id);
      renderSessions(consoleData);
    });
    li.append(btn);
    ul.append(li);
  }
}

function renderTape(rows, meta) {
  $("tape-meta").textContent = meta || "—";
  const ol = $("tape");
  ol.innerHTML = "";
  for (const row of rows) {
    const li = document.createElement("li");
    const action = row.action ?? "event";
    const reason = row.reason ?? row.intent?.reason ?? "";
    const mid = row.mid != null ? `mid ${fmtMoney(row.mid)}` : "";
    li.innerHTML = `<div class="j-action ${action}">${action}</div><div class="muted">${reason}</div><div class="muted">${mid}</div>`;
    ol.append(li);
  }
  if (!rows.length) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="muted">No tape yet — run a session.</div>`;
    ol.append(li);
  }
}

function renderRunnerLog(consoleData) {
  const log = consoleData.runner?.log || [];
  const el = $("runner-log");
  if (!log.length && !consoleData.runner?.running) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = log.slice().reverse().join("\n");
}

function syncControls(consoleData) {
  const dry = $("tog-dry");
  const kill = $("tog-kill");
  const candles = $("inp-candles");
  dry.checked = consoleData.config.dryRun !== false;
  kill.checked = Boolean(consoleData.killSwitch?.armed);
  candles.value = String(consoleData.config.candles ?? 8);
  dry.disabled = Boolean(consoleData.runner?.running);
  candles.disabled = Boolean(consoleData.runner?.running);

  const pill = $("run-pill");
  if (consoleData.runner?.running) {
    pill.textContent = consoleData.config.dryRun ? "RUNNING" : "LIVE";
    pill.className = "pill " + (consoleData.config.dryRun ? "run" : "live");
  } else {
    pill.textContent = "IDLE";
    pill.className = "pill idle";
  }
  $("clock").textContent = new Date(consoleData.now).toLocaleString();
}

function paint(consoleData) {
  state = consoleData;
  renderProducts(consoleData);
  renderDecision(consoleData);
  renderEquity(consoleData);
  renderStrip(consoleData);
  renderSessions(consoleData);
  renderRunnerLog(consoleData);
  syncControls(consoleData);
  if (!selectedId && consoleData.latest?.id) selectedId = consoleData.latest.id;
  if (selectedId) loadTape(selectedId);
}

async function loadTape(id) {
  try {
    const data = await api(`/api/sessions/${encodeURIComponent(id)}?limit=40`);
    const rows = [...(data.journal ?? [])].reverse();
    renderTape(rows, id);
  } catch {
    renderTape([], id);
  }
}

async function refresh() {
  try {
    const data = await api("/api/console");
    paint(data);
  } catch (e) {
    $("decision-title").textContent = "Console offline";
    $("decision-detail").textContent = String(e.message || e);
  }
}

async function controlRun() {
  if (busy) return;
  busy = true;
  try {
    const candles = Number($("inp-candles").value || 8);
    const body = { candles };
    if (state && !state.config.dryRun && state.config.liveTrading) {
      body.confirmLive = "LIVE";
    }
    const data = await api("/api/control/run", { method: "POST", body: JSON.stringify(body) });
    paint(data.console);
  } catch (e) {
    alert(String(e.message || e));
  } finally {
    busy = false;
  }
}

async function controlStop() {
  if (busy) return;
  busy = true;
  try {
    const data = await api("/api/control/stop", { method: "POST", body: "{}" });
    paint(data.console);
  } catch (e) {
    alert(String(e.message || e));
  } finally {
    busy = false;
  }
}

async function setKill(armed) {
  if (busy) return;
  busy = true;
  try {
    const data = await api("/api/control/kill", {
      method: "POST",
      body: JSON.stringify({ armed, reason: armed ? "operator-armed" : "operator-disarmed" }),
    });
    paint(data.console);
  } catch (e) {
    alert(String(e.message || e));
  } finally {
    busy = false;
  }
}

$("tog-kill").addEventListener("change", (e) => {
  setKill(Boolean(e.target.checked));
});

$("tog-dry").addEventListener("change", async (e) => {
  if (busy) return;
  const wantDry = Boolean(e.target.checked);
  if (wantDry) {
    busy = true;
    try {
      const data = await api("/api/control/config", {
        method: "POST",
        body: JSON.stringify({ dryRun: true, liveTrading: false }),
      });
      paint(data.console);
    } catch (err) {
      alert(String(err.message || err));
      e.target.checked = !wantDry;
    } finally {
      busy = false;
    }
    return;
  }
  // turning dry-run off → confirm LIVE
  e.target.checked = true;
  const dialog = $("live-dialog");
  $("live-confirm").value = "";
  dialog.showModal();
});

$("live-form").addEventListener("close", async () => {
  const dialog = $("live-dialog");
  if (dialog.returnValue !== "ok") return;
  const typed = $("live-confirm").value.trim();
  if (typed !== "LIVE") {
    alert('Type LIVE exactly to enable live orders.');
    return;
  }
  busy = true;
  try {
    const data = await api("/api/control/config", {
      method: "POST",
      body: JSON.stringify({ dryRun: false, liveTrading: true, confirmLive: "LIVE" }),
    });
    paint(data.console);
  } catch (err) {
    alert(String(err.message || err));
  } finally {
    busy = false;
  }
});

$("inp-candles").addEventListener("change", async () => {
  if (busy || state?.runner?.running) return;
  busy = true;
  try {
    const data = await api("/api/control/config", {
      method: "POST",
      body: JSON.stringify({ candles: Number($("inp-candles").value || 8) }),
    });
    paint(data.console);
  } catch (err) {
    alert(String(err.message || err));
  } finally {
    busy = false;
  }
});

refresh();
setInterval(refresh, 3000);
