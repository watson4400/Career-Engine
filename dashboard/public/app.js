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
      primary.className = "btn primary" + (consoleData.config.dryRun ? "" : " warn");
      primary.disabled = false;
      primary.onclick = () => controlRun();
    } else if (d.primaryAction === "disarm_kill") {
      primary.textContent = "Disarm kill";
      primary.className = "btn primary";
      primary.disabled = false;
      primary.onclick = () => setKill(false);
    } else if (d.primaryAction === "fix_keys") {
      primary.textContent = "Retry connection";
      primary.className = "btn primary";
      primary.disabled = false;
      primary.onclick = () => refresh();
    } else {
      primary.textContent = "Waiting";
      primary.className = "btn secondary";
      primary.disabled = true;
      primary.onclick = null;
    }
  }
}

function renderEquity(consoleData) {
  const book = consoleData.book;
  const plane = $("equity-plane");
  const caption = $("equity-caption");
  if (book?.ok && book.liveEquity != null) {
    lastEquity = book.liveEquity;
    const money = fmtMoney(book.liveEquity);
    plane.textContent = `$${money}`;
    $("equity").textContent = money;
    const bal = (book.balances || [])
      .map((b) => `${b.currency} ${fmtMoney(b.total ?? b.available)}`)
      .join(" · ");
    caption.textContent = bal
      ? `Live · ${bal}`
      : `Live equity · $${money}`;
    const spread =
      book.spreadBps != null
        ? ` · spread ${Number(book.spreadBps).toFixed(1)} bps${book.spreadOk === false ? " wide" : ""}`
        : "";
    $("mid-line").textContent = `${book.productId} · $${fmtMoney(book.mid)}${spread}`;
    $("equity-sub").textContent = bal || "";
  } else if (lastEquity != null) {
    plane.textContent = `$${fmtMoney(lastEquity)}`;
    caption.textContent = book?.error
      ? `Stale · ${String(book.error).slice(0, 70)}`
      : "Stale · last good (not $0)";
    $("mid-line").textContent = "—";
  } else {
    // Avoid a lone em-dash at display size (reads as a thin bar)
    plane.textContent = "$···";
    caption.textContent = book?.error
      ? `Not loaded · ${String(book.error).slice(0, 80)}`
      : "Not loaded · not $0";
    $("mid-line").textContent = "—";
  }
}

function renderSessions(consoleData) {
  const sessions = consoleData.sessions || [];
  $("session-count").textContent = String(consoleData.sessionCount ?? sessions.length);
  const ul = $("session-list");
  ul.innerHTML = "";
  for (const s of sessions.slice(0, 20)) {
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
  $("clock").textContent = new Date(consoleData.now).toLocaleString();
}

function paint(consoleData) {
  state = consoleData;
  renderProducts(consoleData);
  renderDecision(consoleData);
  renderEquity(consoleData);
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
  e.target.checked = true;
  $("live-confirm").value = "";
  $("live-dialog").showModal();
});

$("live-form").addEventListener("close", async () => {
  if ($("live-dialog").returnValue !== "ok") return;
  if ($("live-confirm").value.trim() !== "LIVE") {
    alert("Type LIVE exactly to enable live orders.");
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
