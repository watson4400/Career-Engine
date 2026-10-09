const $ = (id) => document.getElementById(id);

let selectedId = null;
/** Last good Coinbase equity — "—" means not loaded, never treat as $0 */
let lastLiveEquity = null;
let lastLiveBalances = null;

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function equityFromBook(book) {
  if (!book || book.ok === false) return null;
  if (book.liveEquity != null && Number.isFinite(Number(book.liveEquity))) {
    return Number(book.liveEquity);
  }
  // Fallback: sum USD/USDC (+ BTC*mid) from balances if server omitted liveEquity
  const bals = book.balances || [];
  if (!bals.length) return null;
  let cash = 0;
  let btc = 0;
  for (const b of bals) {
    const amt = Number(b.total ?? b.available ?? 0);
    if (!Number.isFinite(amt)) continue;
    if (b.currency === "USD" || b.currency === "USDC") cash += amt;
    if (b.currency === "BTC") btc += amt;
  }
  const mid = Number(book.mid);
  if (!(cash > 0 || btc > 0)) return cash === 0 && btc === 0 ? 0 : null;
  return cash + (Number.isFinite(mid) ? btc * mid : 0);
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n) * 100;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function fmtPnlUsd(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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
  const start =
    s.startingEquity ?? result?.startingEquity ?? summary?.startingEquity;

  if (pnlUsd == null && equity != null && start != null) {
    pnlUsd = Number(equity) - Number(start);
  }
  if (pnlPct == null && equity != null && start != null && Number(start) > 0) {
    pnlPct = (Number(equity) - Number(start)) / Number(start);
  }
  if (pnlUsd == null && pnlPct != null && equity != null) {
    // derive approx USD from pct when start unknown
    const startEst = Number(equity) / (1 + Number(pnlPct));
    if (Number.isFinite(startEst)) pnlUsd = Number(equity) - startEst;
  }
  return { pnlPct, pnlUsd };
}

function gate(label, state) {
  const el = document.createElement("span");
  el.className = `gate ${state}`;
  el.textContent = label;
  return el;
}

function renderGates(status) {
  const row = $("gates");
  row.innerHTML = "";
  const f = status.flags;
  row.append(
    gate(f.liveTrading ? "LIVE_TRADING on" : "LIVE_TRADING off", f.liveTrading ? "off" : "on"),
    gate(
      f.coinbaseDryRun ? "COINBASE dry-run" : "COINBASE live orders",
      f.coinbaseDryRun ? "on" : "off",
    ),
    gate(
      status.killSwitch.armed
        ? `Kill ARMED${status.killSwitch.reason ? ": " + status.killSwitch.reason : ""}`
        : "Kill switch disarmed",
      status.killSwitch.armed ? "warn" : "off",
    ),
    gate(f.hasTypesafe ? "Jev key set" : "Jev key missing", f.hasTypesafe ? "on" : "warn"),
    gate(f.hasCoinbase ? "Coinbase key set" : "Coinbase key missing", f.hasCoinbase ? "on" : "warn"),
    gate(`Product ${f.productId}`, "on"),
  );
}

function renderPnl(pnlUsd, pnlPct) {
  const el = $("stat-pnl");
  const elPct = $("stat-pnl-pct");
  el.className = `stat-value mono ${pnlClass(pnlUsd ?? pnlPct)}`;
  elPct.className = `stat-sub mono ${pnlClass(pnlPct ?? pnlUsd)}`;
  el.textContent = fmtPnlUsd(pnlUsd);
  elPct.textContent = pnlPct == null ? "—" : fmtPct(pnlPct);
}

function renderLatest(status, book) {
  const latest = status.latest;
  $("clock").textContent = new Date(status.now).toLocaleString();

  // Live Coinbase equity (real account) — not paper's 100k.
  // Em-dash means "not loaded" — it is NOT zero. Doctor equity is the source of truth until this loads.
  const merged = book?.ok ? book : status.book?.ok ? status.book : book;
  const eq = equityFromBook(merged);
  if (eq != null) {
    lastLiveEquity = eq;
    lastLiveBalances = merged.balances || null;
    $("stat-equity").textContent = fmtMoney(eq);
    const bal = (merged.balances || [])
      .map((b) => `${b.currency} ${fmtMoney(b.total ?? b.available)}`)
      .join(" · ");
    $("stat-equity-sub").textContent =
      bal || `cash ${fmtMoney(merged.liveCash ?? eq)} · not zero`;
  } else if (lastLiveEquity != null) {
    $("stat-equity").textContent = fmtMoney(lastLiveEquity);
    $("stat-equity-sub").textContent = merged?.error
      ? `stale · ${String(merged.error).slice(0, 60)}`
      : "stale (last good) · not zero";
  } else if (merged?.ok && merged.mid != null && merged.liveEquity == null) {
    $("stat-equity").textContent = "—";
    $("stat-equity-sub").textContent = "Restart dashboard — not $0";
  } else {
    $("stat-equity").textContent = "—";
    $("stat-equity-sub").textContent = merged?.error
      ? `not loaded · ${String(merged.error).slice(0, 70)}`
      : status.flags?.hasCoinbase === false
        ? "not loaded · Coinbase keys missing in dashboard .env"
        : "not loaded · waiting for Coinbase (not $0)";
  }

  if (!latest) {
    $("latest-mode").textContent = "No sessions yet";
    $("latest-sub").textContent = "Run npm run paper or npm run coinbase:live";
    $("stat-orders").textContent = "—";
    renderPnl(null, null);
  } else {
    const mode = latest.mode ?? latest.summary?.mode ?? "session";
    $("latest-mode").textContent = String(mode);
    const { pnlPct, pnlUsd } = sessionPnl(latest);
    const bits = [
      latest.id,
      latest.jev ? `jev:${latest.jev}` : null,
      latest.productId ? `product:${latest.productId}` : null,
      latest.equity != null ? `session equity ${fmtMoney(latest.equity)}` : null,
      latest.brier != null ? `brier:${Number(latest.brier).toFixed(3)}` : null,
    ].filter(Boolean);
    $("latest-sub").textContent = bits.join(" · ");
    $("stat-orders").textContent = `${latest.orders ?? "—"} / ${latest.holds ?? "—"}`;
    renderPnl(pnlUsd, pnlPct);
    if (!selectedId) selectedId = latest.id;
  }
  if (book?.ok) {
    $("stat-mid").textContent = fmtMoney(book.mid);
    const midLabel = $("stat-mid-label");
    if (midLabel) midLabel.textContent = `${book.productId ?? "Product"} mid`;
  } else {
    $("stat-mid").textContent = book?.error ? "n/a" : "—";
  }
}

function renderSessions(sessions) {
  $("session-count").textContent = String(sessions.length);
  const ul = $("session-list");
  ul.innerHTML = "";
  for (const s of sessions.slice(0, 30)) {
    const li = document.createElement("li");
    if (s.id === selectedId) li.classList.add("active");
    const { pnlPct, pnlUsd } = sessionPnl(s);
    const pnlBit =
      pnlUsd != null
        ? ` · P&L ${fmtPnlUsd(pnlUsd)} (${fmtPct(pnlPct)})`
        : pnlPct != null
          ? ` · P&L ${fmtPct(pnlPct)}`
          : "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<div class="sid">${s.id}</div><div class="muted">${s.mode ?? "—"} · orders ${s.orders ?? 0} · holds ${s.holds ?? 0}${pnlBit}</div>`;
    btn.addEventListener("click", () => {
      selectedId = s.id;
      loadJournal(s.id);
      renderSessions(sessions);
      // Update session P&L / mode — do NOT overwrite live Coinbase equity
      const { pnlPct: p, pnlUsd: u } = sessionPnl(s);
      $("latest-mode").textContent = String(s.mode ?? "session");
      $("latest-sub").textContent = `${s.id} · session equity ${fmtMoney(s.equity)}`;
      $("stat-orders").textContent = `${s.orders ?? "—"} / ${s.holds ?? "—"}`;
      renderPnl(u, p);
    });
    li.append(btn);
    ul.append(li);
  }
}

function renderJournal(payload) {
  $("journal-session").textContent = payload.id;
  const ol = $("journal");
  ol.innerHTML = "";
  const rows = [...(payload.journal ?? [])].reverse();
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
    li.innerHTML = `<div class="muted">No journal lines</div>`;
    ol.append(li);
  }
}

async function loadJournal(id) {
  const res = await fetch(`/api/sessions/${encodeURIComponent(id)}?limit=60`);
  const data = await res.json();
  renderJournal(data);
}

async function refresh() {
  const [statusRes, sessionsRes, bookRes] = await Promise.all([
    fetch("/api/status"),
    fetch("/api/sessions"),
    fetch("/api/book"),
  ]);
  const status = await statusRes.json();
  const { sessions } = await sessionsRes.json();
  let book = null;
  try {
    book = await bookRes.json();
  } catch {
    book = { ok: false, error: "book parse failed" };
  }
  // Prefer dedicated book; fall back to status.book (same payload, newer servers)
  if ((!book || book.ok === false) && status.book?.ok) {
    book = status.book;
  }
  renderGates(status);
  renderLatest(status, book);
  renderSessions(sessions);
  if (selectedId) await loadJournal(selectedId);
}

refresh();
setInterval(refresh, 5000);
