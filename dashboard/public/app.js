const $ = (id) => document.getElementById(id);

let selectedId = null;

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${(Number(n) * 100).toFixed(2)}%`;
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
    gate(status.killSwitch.armed ? "Kill switch ARMED" : "Kill switch disarmed", status.killSwitch.armed ? "warn" : "off"),
    gate(f.hasTypesafe ? "Jev key set" : "Jev key missing", f.hasTypesafe ? "on" : "warn"),
    gate(f.hasCoinbase ? "Coinbase key set" : "Coinbase key missing", f.hasCoinbase ? "on" : "warn"),
    gate(`Product ${f.productId}`, "on"),
  );
}

function renderLatest(status, book) {
  const latest = status.latest;
  $("clock").textContent = new Date(status.now).toLocaleString();
  if (!latest) {
    $("latest-mode").textContent = "No sessions yet";
    $("latest-sub").textContent = "Run npm run paper or npm run coinbase:live";
    $("stat-equity").textContent = "—";
    $("stat-orders").textContent = "—";
    $("stat-holds").textContent = "—";
  } else {
    const mode = latest.mode ?? latest.summary?.mode ?? "session";
    $("latest-mode").textContent = String(mode);
    const bits = [
      latest.id,
      latest.jev ? `jev:${latest.jev}` : null,
      latest.productId ? `product:${latest.productId}` : null,
      latest.brier != null ? `brier:${Number(latest.brier).toFixed(3)}` : null,
      latest.pnlPct != null ? `pnl:${fmtPct(latest.pnlPct)}` : null,
    ].filter(Boolean);
    $("latest-sub").textContent = bits.join(" · ");
    $("stat-equity").textContent = fmtMoney(latest.equity);
    $("stat-orders").textContent = String(latest.orders ?? "—");
    $("stat-holds").textContent = String(latest.holds ?? "—");
    if (!selectedId) selectedId = latest.id;
  }
  if (book?.ok) {
    $("stat-mid").textContent = fmtMoney(book.mid);
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
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `<div class="sid">${s.id}</div><div class="muted">${s.mode ?? "—"} · orders ${s.orders ?? 0} · holds ${s.holds ?? 0}</div>`;
    btn.addEventListener("click", () => {
      selectedId = s.id;
      loadJournal(s.id);
      renderSessions(sessions);
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
  const book = await bookRes.json();
  renderGates(status);
  renderLatest(status, book);
  renderSessions(sessions);
  if (selectedId) await loadJournal(selectedId);
}

refresh();
setInterval(refresh, 5000);
