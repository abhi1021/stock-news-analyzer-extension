// ─────────────────────────────────────────────
// STATE & DOM REFERENCES
// ─────────────────────────────────────────────
let isRunning = false;
let traceCards = [];

const apiKeyInput  = document.getElementById("apiKey");
const keyStatus    = document.getElementById("keyStatus");
const queryInput   = document.getElementById("queryInput");
const btnAnalyze   = document.getElementById("btnAnalyze");
const btnClear     = document.getElementById("btnClear");
const btnDownloadLogs = document.getElementById("btnDownloadLogs");
const tracePanel   = document.getElementById("tracePanel");
const emptyState   = document.getElementById("emptyState");
const statusBar    = document.getElementById("statusBar");
const statusDot    = document.getElementById("statusDot");
const statusText   = document.getElementById("statusText");

// ─────────────────────────────────────────────
// API KEY PERSISTENCE (Chrome storage)
// ─────────────────────────────────────────────
let savedApiKey = "";

// Load saved API key on startup
chrome.storage.local.get(['geminiApiKey'], (result) => {
  if (result.geminiApiKey) {
    savedApiKey = result.geminiApiKey;
    apiKeyInput.value = savedApiKey;
    keyStatus.textContent = "ready";
    keyStatus.className = "key-status saved";
  }
});

apiKeyInput.addEventListener("input", () => {
  savedApiKey = apiKeyInput.value.trim();
  const isValid = savedApiKey.length > 10;
  keyStatus.textContent = isValid ? "ready" : "not saved";
  keyStatus.className = "key-status" + (isValid ? " saved" : "");

  // Save to Chrome storage
  if (isValid) {
    chrome.storage.local.set({ geminiApiKey: savedApiKey });
  }
});

// ─────────────────────────────────────────────
// SUGGESTION CHIPS
// ─────────────────────────────────────────────
document.getElementById("chips").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip || isRunning) return;
  queryInput.value = chip.dataset.query;
  queryInput.focus();
});

// ─────────────────────────────────────────────
// CLEAR
// ─────────────────────────────────────────────
btnClear.addEventListener("click", () => {
  if (isRunning) return;
  clearTrace();
});

// ─────────────────────────────────────────────
// DOWNLOAD LOGS
// ─────────────────────────────────────────────
btnDownloadLogs.addEventListener("click", () => {
  const summary = Logger.getLogsSummary();
  console.log(`Downloading ${summary.total} logs (${summary.errors} errors, ${summary.warnings} warnings)`);
  Logger.downloadLogs();
});

function clearTrace() {
  traceCards = [];
  tracePanel.innerHTML = "";
  tracePanel.appendChild(emptyState);
  emptyState.style.display = "flex";
  setStatus("idle", "Ready");
}

// ─────────────────────────────────────────────
// ANALYZE BUTTON
// ─────────────────────────────────────────────
btnAnalyze.addEventListener("click", startAnalysis);
queryInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !isRunning) startAnalysis();
});

async function startAnalysis() {
  const query = queryInput.value.trim();
  if (!query) {
    queryInput.focus();
    return;
  }
  if (!savedApiKey) {
    alert("Please enter your Gemini API key first.");
    apiKeyInput.focus();
    return;
  }
  if (isRunning) return;

  isRunning = true;
  btnAnalyze.disabled = true;
  clearTrace();

  setStatus("active", "Agent running…");

  try {
    await runAgentLoop(savedApiKey, query, onTrace);
  } catch (err) {
    onTrace({ type: "error", text: "Unexpected error: " + err.message });
  }

  isRunning = false;
  btnAnalyze.disabled = false;
}

// ─────────────────────────────────────────────
// TRACE CALLBACK
// ─────────────────────────────────────────────
function onTrace(event) {
  // Hide empty state on first trace
  emptyState.style.display = "none";

  switch (event.type) {
    case "user":
      addTraceCard({
        type: "user",
        badge: "👤 User",
        title: event.text,
        bodyHtml: `<p style="font-size:0.84rem;color:var(--text);line-height:1.6;">${escHtml(event.text)}</p>`
      });
      break;

    case "llm_thinking":
      addTraceCard({
        type: "llm_thinking",
        badge: "🧠 Gemini",
        title: event.text,
        spinnerInBadge: true,
        bodyHtml: `<p style="font-size:0.8rem;color:var(--text-muted);">${escHtml(event.text)}</p>`
      });
      setStatus("active", event.text);
      break;

    case "tool_call":
      addTraceCard({
        type: "tool_call",
        badge: "⚙️ Tool Call",
        title: `${event.name}(${argsShortLabel(event.args)})`,
        bodyHtml: buildToolCallBody(event.name, event.args),
        expandedByDefault: true
      });
      setStatus("active", `Calling ${event.name}…`);
      break;

    case "tool_result":
      addTraceCard({
        type: "tool_result",
        badge: "📦 Tool Result",
        title: buildResultTitle(event.name, event.result),
        bodyHtml: buildToolResultBody(event.name, event.result),
        expandedByDefault: true
      });
      setStatus("active", `Got result from ${event.name}`);
      break;

    case "final":
      addTraceCard({
        type: "final",
        badge: "✅ Final Answer",
        title: "Gemini analysis complete",
        bodyHtml: `<div class="final-text">${formatFinalText(event.text)}</div>`,
        expandedByDefault: true
      });
      setStatus("done", "Analysis complete");
      break;

    case "error":
      addTraceCard({
        type: "error",
        badge: "❌ Error",
        title: event.text,
        bodyHtml: `<p style="font-size:0.8rem;color:var(--error);">${escHtml(event.text)}</p>`
      });
      setStatus("error", "Error occurred");
      break;
  }
}

// ─────────────────────────────────────────────
// CARD BUILDER
// ─────────────────────────────────────────────
function addTraceCard({ type, badge, title, bodyHtml, expandedByDefault = false, spinnerInBadge = false }) {
  const card = document.createElement("div");
  card.className = `trace-card type-${type}${expandedByDefault ? " expanded" : ""}`;

  const badgeHtml = spinnerInBadge
    ? `<div class="trace-badge"><span class="spinner"></span> ${escHtml(badge)}</div>`
    : `<div class="trace-badge">${escHtml(badge)}</div>`;

  card.innerHTML = `
    <div class="trace-card-header">
      ${badgeHtml}
      <div class="trace-card-title">${escHtml(title)}</div>
      <svg class="trace-card-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="trace-card-body">${bodyHtml}</div>
  `;

  card.querySelector(".trace-card-header").addEventListener("click", () => {
    card.classList.toggle("expanded");
  });

  tracePanel.appendChild(card);
  card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  traceCards.push(card);
}

// ─────────────────────────────────────────────
// BODY BUILDERS
// ─────────────────────────────────────────────
function buildToolCallBody(name, args) {
  const rows = Object.entries(args || {}).map(([k, v]) => {
    const val = typeof v === "object" ? JSON.stringify(v, null, 2) : escHtml(String(v));
    return `<tr><td>${escHtml(k)}</td><td>${val}</td></tr>`;
  }).join("");
  return `
    <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:8px;">
      Function declared to Gemini — parameters passed:
    </p>
    <table class="args-table"><tbody>${rows}</tbody></table>
  `;
}

function buildResultTitle(name, result) {
  if (name === "search_stock_news") {
    return `${result.total_articles} news articles found for ${result.symbol}`;
  }
  if (name === "get_stock_price_history") {
    const chg = result.total_change_pct;
    const sign = chg >= 0 ? "+" : "";
    return `${result.total_trading_days} trading days · ${result.symbol} ${sign}${chg}% overall`;
  }
  if (name === "analyze_news_price_impact") {
    return `Impact analysis for ${result.analysis_count} news events`;
  }
  return `Result from ${name}`;
}

function buildToolResultBody(name, result) {
  if (name === "search_stock_news" && result.articles) {
    const items = result.articles.map(a => `
      <div class="news-item ${a.sentiment}">
        <div class="news-date">${a.date} · <span class="news-source">${escHtml(a.source)}</span></div>
        <div class="news-headline">${escHtml(a.headline)}</div>
        <div class="news-source sentiment-${a.sentiment}">Sentiment: ${a.sentiment}</div>
      </div>
    `).join("");
    return `<div class="news-list">${items}</div>`;
  }

  if (name === "get_stock_price_history" && result.prices) {
    const summary = `
      <div style="display:flex;gap:16px;margin-bottom:8px;font-size:0.78rem;color:var(--text-muted);">
        <span>Start: <strong style="color:var(--text);">${result.start_price}</strong></span>
        <span>End: <strong style="color:var(--text);">${result.end_price}</strong></span>
        <span>Change: <strong class="${result.total_change_pct >= 0 ? 'pct-pos' : 'pct-neg'}">${result.total_change_pct >= 0 ? '+' : ''}${result.total_change_pct}%</strong></span>
        <span>Days: <strong style="color:var(--text);">${result.total_trading_days}</strong></span>
      </div>
    `;
    // Show first + last 5 prices
    const prices = result.prices;
    const sample = prices.length > 10
      ? [...prices.slice(0, 5), { date: "...", open: "...", close: "...", high: "...", low: "..." }, ...prices.slice(-5)]
      : prices;

    const rows = sample.map(p => {
      if (p.date === "...") return `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);">…</td></tr>`;
      const chg = p.open !== "..." ? (((p.close - p.open) / p.open) * 100).toFixed(2) : "";
      const cls = chg >= 0 ? "pct-pos" : "pct-neg";
      return `<tr>
        <td>${p.date}</td>
        <td>${p.open}</td>
        <td>${p.close}</td>
        <td>${p.high}</td>
        <td>${p.low}</td>
      </tr>`;
    }).join("");

    return `${summary}
      <div class="impact-table-wrap">
        <table class="impact-table">
          <thead><tr><th>Date</th><th>Open</th><th>Close</th><th>High</th><th>Low</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  if (name === "analyze_news_price_impact" && result.impact_table) {
    const rows = result.impact_table.map(r => {
      const c1 = parseFloat(r.change_1d_pct);
      const c2 = parseFloat(r.change_2d_pct);
      const cls1 = isNaN(c1) ? "pct-neu" : c1 >= 0 ? "pct-pos" : "pct-neg";
      const cls2 = isNaN(c2) ? "pct-neu" : c2 >= 0 ? "pct-pos" : "pct-neg";
      const sign = v => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) ? "+" : "";
      return `<tr>
        <td>${r.news_date}</td>
        <td style="max-width:180px">${escHtml(r.headline)}</td>
        <td class="sentiment-${r.sentiment}">${r.sentiment}</td>
        <td class="${cls1}">${sign(r.change_1d_pct)}${r.change_1d_pct}%</td>
        <td class="${cls2}">${sign(r.change_2d_pct)}${r.change_2d_pct}%</td>
        <td style="color:var(--text-muted);font-size:0.7rem">${escHtml(r.likely_impact)}</td>
      </tr>`;
    }).join("");
    return `<div class="impact-table-wrap">
      <table class="impact-table">
        <thead><tr><th>Date</th><th>Headline</th><th>Sentiment</th><th>+1d</th><th>+2d</th><th>Assessment</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // Fallback: raw JSON
  return `<pre class="json-block">${escHtml(JSON.stringify(result, null, 2))}</pre>`;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function escHtml(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function argsShortLabel(args) {
  if (!args) return "";
  const parts = [];
  if (args.symbol) parts.push(args.symbol);
  if (args.start_date) parts.push(args.start_date);
  if (args.end_date) parts.push(args.end_date);
  return parts.join(", ");
}

function formatFinalText(text) {
  // Basic markdown-ish rendering
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^#{1,3} (.+)$/gm, '<br><strong style="color:var(--final);font-size:0.9rem">$1</strong><br>')
    .replace(/\n/g, "<br>");
}

function setStatus(state, text) {
  statusDot.className = "status-dot";
  statusBar.className = "status-bar";
  if (state === "active") { statusDot.classList.add("active"); statusBar.classList.add("active"); }
  if (state === "done")   { statusDot.classList.add("done"); }
  if (state === "error")  { statusDot.classList.add("error"); }
  statusText.textContent = text;
}
