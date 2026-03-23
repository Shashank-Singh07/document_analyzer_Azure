/**
 * DocIntel Studio — app.js
 * Azure Document Intelligence UI
 * Pure vanilla JS — no frameworks, no dependencies
 */

"use strict";

// ══ State ══════════════════════════════════════════════════════════════════
const state = {
  status: "idle",      // idle | loading | success | error
  result: null,
  pollCount: 0,
  pollTimer: null,
  configVisible: true,
};

// ══ DOM refs ════════════════════════════════════════════════════════════════
const $ = (id) => document.getElementById(id);

const DOM = {
  // Config
  inputEndpoint:  $("inputEndpoint"),
  inputApiKey:    $("inputApiKey"),
  inputDocUrl:    $("inputDocUrl"),
  selectModel:    $("selectModel"),
  btnAnalyze:     $("btnAnalyze"),
  btnIcon:        $("btnAnalyze")?.querySelector(".btn-icon"),
  btnLabel:       $("btnAnalyze")?.querySelector(".btn-label"),
  spinner:        $("spinner"),
  terminal:       $("terminal"),
  terminalBody:   $("terminalBody"),

  // Header
  statusTag:      $("statusTag"),
  btnReset:       $("btnReset"),

  // Layout
  mainLayout:     $("mainLayout"),
  configPanel:    $("configPanel"),
  resultsPanel:   $("resultsPanel"),
  emptyState:     $("emptyState"),
  btnToggleConfig:$("btnToggleConfig"),

  // Stats
  statPages:      $("statPages"),
  statTables:     $("statTables"),
  statKV:         $("statKV"),
  statWords:      $("statWords"),

  // Confidence
  confidenceBox:  $("confidenceBox"),
  confPct:        $("confPct"),
  progressFill:   $("progressFill"),

  // Tabs
  tabBtns:        document.querySelectorAll(".tab-btn"),

  // Panes
  paneText:       $("paneText"),
  paneTables:     $("paneTables"),
  paneKV:         $("paneKV"),
  paneRaw:        $("paneRaw"),

  // Pane content
  textPages:      $("textPages"),
  tablesContainer:$("tablesContainer"),
  kvContainer:    $("kvContainer"),
  rawJson:        $("rawJson"),

  // Raw
  btnCopyJson:    $("btnCopyJson"),
};

// ══ Logging ════════════════════════════════════════════════════════════════
function log(msg, type = "info") {
  DOM.terminal.classList.remove("hidden");

  const line = document.createElement("span");
  line.className = `log-line ${type}`;

  const prompt = document.createElement("span");
  prompt.className = "prompt";
  prompt.textContent = "> ";

  line.appendChild(prompt);
  line.appendChild(document.createTextNode(msg));

  DOM.terminalBody.appendChild(line);
  DOM.terminalBody.appendChild(document.createElement("br"));
  DOM.terminalBody.scrollTop = DOM.terminalBody.scrollHeight;
}

function clearLogs() {
  DOM.terminalBody.innerHTML = "";
  DOM.terminal.classList.add("hidden");
}

// ══ Status management ═══════════════════════════════════════════════════════
function setStatus(s, extra = "") {
  state.status = s;
  const tag = DOM.statusTag;
  tag.className = "status-tag";

  const labels = {
    idle:    "IDLE",
    loading: extra || "ANALYZING…",
    success: "SUCCESS",
    error:   "ERROR",
  };

  tag.textContent = labels[s] ?? s.toUpperCase();
  if (s !== "idle") tag.classList.add(s);
}

// ══ Analyze ════════════════════════════════════════════════════════════════
async function analyze() {
  const endpoint = DOM.inputEndpoint.value.trim();
  const apiKey   = DOM.inputApiKey.value.trim();
  const docUrl   = DOM.inputDocUrl.value.trim();
  const model    = DOM.selectModel.value;

  // ── Validation ──────────────────────────────────────────────────────────
  if (!endpoint || !apiKey || !docUrl) {
    log("⚠ Please fill all required fields.", "error");
    return;
  }

  // Endpoint sanity checks
  if (!endpoint.startsWith("https://")) {
    log("⚠ Endpoint must start with https://", "error");
    log("   Example: https://my-resource.cognitiveservices.azure.com", "error");
    return;
  }
  if (endpoint.includes("/formrecognizer") || endpoint.includes("/documentintelligence")) {
    log("⚠ Endpoint should be the BASE URL only — no path after the domain.", "error");
    log("   Correct: https://my-resource.cognitiveservices.azure.com", "error");
    return;
  }

  // ── Reset UI ─────────────────────────────────────────────────────────────
  clearLogs();
  state.result    = null;
  state.pollCount = 0;
  clearTimeout(state.pollTimer);
  DOM.resultsPanel.classList.add("hidden");
  DOM.emptyState.classList.remove("hidden");

  setStatus("loading");
  setAnalyzeUI(true);

  // ── Build URL ─────────────────────────────────────────────────────────────
  // Strip trailing slash, then try the 2024 GA path first, fall back to older path
  const base = endpoint.replace(/\/+$/, "");

  // Azure Document Intelligence 2024-11-30 GA (latest stable)
  const urlGA      = `${base}/documentintelligence/documentModels/${model}:analyze?api-version=2024-11-30`;
  // 2024-02-29 preview (fallback)
  const urlPreview = `${base}/documentintelligence/documentModels/${model}:analyze?api-version=2024-02-29-preview`;
  // Legacy Form Recognizer path (very old resources)
  const urlLegacy  = `${base}/formrecognizer/documentModels/${model}:analyze?api-version=2023-07-31`;

  log(`Endpoint: ${base}`);
  log(`Submitting to model: ${model}…`);

  const trySubmit = async (url, label) => {
    log(`Trying API version: ${label}…`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urlSource: docUrl }),
    });
    return res;
  };

  try {
    let submitRes = await trySubmit(urlGA, "2024-11-30 GA");

    // If GA version 404s, try preview
    if (submitRes.status === 404) {
      log("GA version not found, trying preview…");
      submitRes = await trySubmit(urlPreview, "2024-02-29-preview");
    }

    // If both 404, try legacy Form Recognizer path
    if (submitRes.status === 404) {
      log("Preview not found, trying legacy path…");
      submitRes = await trySubmit(urlLegacy, "2023-07-31 legacy");
    }

    if (!submitRes.ok) {
      let errMsg = `Submit failed (${submitRes.status})`;
      try {
        const errBody = await submitRes.json();
        const inner = errBody?.error?.innererror?.message
          || errBody?.error?.message
          || JSON.stringify(errBody);
        errMsg += `: ${inner}`;
      } catch {
        errMsg += `: ${await submitRes.text()}`;
      }

      // Friendly hints per status code
      if (submitRes.status === 401) {
        log("→ Check: Is your API Key correct?", "error");
      } else if (submitRes.status === 404) {
        log("→ Check: Is your Endpoint URL correct?", "error");
        log("→ Format: https://YOUR-NAME.cognitiveservices.azure.com", "error");
      } else if (submitRes.status === 400) {
        log("→ Check: Is the Document URL publicly accessible?", "error");
      }

      throw new Error(errMsg);
    }

    const opUrl = submitRes.headers.get("operation-location");
    if (!opUrl) throw new Error("No operation-location header in response. Check your endpoint URL.");

    log("✓ Job accepted. Polling for result…", "success");
    await poll(opUrl, apiKey);

  } catch (err) {
    log(err.message, "error");
    setStatus("error");
    setAnalyzeUI(false);
  }
}

async function poll(opUrl, apiKey) {
  state.pollCount++;
  setStatus("loading", `POLLING ${state.pollCount}×`);

  try {
    const res = await fetch(opUrl, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    });

    if (!res.ok) throw new Error(`Poll failed (${res.status})`);

    const data = await res.json();

    if (data.status === "succeeded") {
      log(`Extraction complete after ${state.pollCount} poll(s).`, "success");
      state.result = data.analyzeResult;
      setStatus("success");
      setAnalyzeUI(false);
      renderResults(data.analyzeResult);

    } else if (data.status === "failed") {
      throw new Error(data.error?.message ?? "Analysis failed.");

    } else {
      log(`Status: ${data.status} (attempt ${state.pollCount})…`);
      state.pollTimer = setTimeout(() => poll(opUrl, apiKey), 1800);
    }

  } catch (err) {
    log(err.message, "error");
    setStatus("error");
    setAnalyzeUI(false);
  }
}

function setAnalyzeUI(loading) {
  DOM.btnAnalyze.disabled = loading;

  if (loading) {
    DOM.btnIcon.classList.add("hidden");
    DOM.btnLabel.textContent = "Analyzing…";
    DOM.spinner.classList.remove("hidden");
  } else {
    DOM.btnIcon.classList.remove("hidden");
    DOM.btnLabel.textContent = "ANALYZE DOCUMENT";
    DOM.spinner.classList.add("hidden");
  }
}

// ══ Render results ══════════════════════════════════════════════════════════
function renderResults(result) {
  const pages   = result.pages   ?? [];
  const tables  = result.tables  ?? [];
  const kvPairs = result.keyValuePairs ?? [];

  // Word count
  const allText  = pages.flatMap((p) => p.lines?.map((l) => l.content) ?? []).join(" ");
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  // Stats
  DOM.statPages.textContent  = pages.length;
  DOM.statTables.textContent = tables.length;
  DOM.statKV.textContent     = kvPairs.length;
  DOM.statWords.textContent  = wordCount;

  // Confidence
  if (pages.length > 0) {
    const avgConf = pages.reduce((acc, p) => {
      const words = p.words ?? [];
      const conf  = words.length
        ? words.reduce((a, w) => a + (w.confidence ?? 1), 0) / words.length
        : 1;
      return acc + conf;
    }, 0) / pages.length;

    const pct = Math.min(Math.round(avgConf * 100), 100);
    DOM.confidenceBox.classList.remove("hidden");
    DOM.confPct.textContent = `${pct}%`;
    // Delay for CSS transition
    requestAnimationFrame(() => {
      DOM.progressFill.style.width = `${pct}%`;
    });
  }

  // Text pages
  DOM.textPages.innerHTML = "";
  if (pages.length === 0) {
    DOM.textPages.innerHTML = emptyMsg("No text content extracted.");
  } else {
    pages.forEach((page) => {
      const block = document.createElement("div");
      block.className = "page-block";

      const header = document.createElement("div");
      header.className = "page-header";
      header.innerHTML = `
        <span class="glow-dot"></span>
        <span class="page-title">PAGE ${page.pageNumber}</span>
        ${page.width ? `<span class="tag">${page.width} × ${page.height} ${page.unit ?? ""}</span>` : ""}
      `;

      const pre = document.createElement("pre");
      pre.className = "page-text";
      pre.textContent = page.lines?.map((l) => l.content).join("\n") ?? "No text found.";

      block.appendChild(header);
      block.appendChild(pre);
      DOM.textPages.appendChild(block);
    });
  }

  // Tables
  DOM.tablesContainer.innerHTML = "";
  if (tables.length === 0) {
    DOM.tablesContainer.innerHTML = emptyMsg("No tables detected in this document.");
  } else {
    tables.forEach((table, i) => renderTable(table, i));
  }

  // Key-Value pairs
  DOM.kvContainer.innerHTML = "";
  if (kvPairs.length === 0) {
    DOM.kvContainer.innerHTML = emptyMsg(
      "No key-value pairs extracted.<br><small>Try the Invoice or Receipt model for structured forms.</small>"
    );
  } else {
    const panel = document.createElement("div");
    panel.className = "kv-panel";

    const header = document.createElement("div");
    header.className = "kv-section-header";
    header.innerHTML = `
      <span class="glow-dot green"></span>
      <span class="kv-section-title">KEY–VALUE PAIRS</span>
      <span class="tag tag-green">${kvPairs.length}</span>
    `;
    panel.appendChild(header);

    kvPairs.forEach((kv) => {
      const row = document.createElement("div");
      row.className = "kv-row";
      row.innerHTML = `
        <span class="kv-key">${escHtml(kv.key?.content ?? "—")}</span>
        <span class="kv-value">${escHtml(kv.value?.content ?? "—")}</span>
      `;
      panel.appendChild(row);
    });

    DOM.kvContainer.appendChild(panel);
  }

  // Raw JSON
  DOM.rawJson.textContent = JSON.stringify(result, null, 2);

  // Show results
  DOM.emptyState.classList.add("hidden");
  DOM.resultsPanel.classList.remove("hidden");
  DOM.btnReset.classList.remove("hidden");

  // Reset to text tab
  switchTab("text");

  // Update layout to two-column
  DOM.mainLayout.style.gridTemplateColumns = "380px 1fr";

  // Show toggle config btn
  DOM.btnToggleConfig.textContent = "▲ HIDE CONFIG";
  state.configVisible = true;
}

// ── Table renderer ──────────────────────────────────────────────────────────
function renderTable(table, index) {
  if (!table.cells || table.cells.length === 0) return;

  // Build row map
  const rows = {};
  table.cells.forEach((cell) => {
    const r = cell.rowIndex ?? 0;
    if (!rows[r]) rows[r] = [];
    rows[r].push(cell);
  });
  const sortedRows = Object.keys(rows)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => rows[k].sort((a, b) => (a.columnIndex ?? 0) - (b.columnIndex ?? 0)));

  const block = document.createElement("div");
  block.className = "table-block";

  // Header
  const header = document.createElement("div");
  header.className = "table-header";
  header.innerHTML = `
    <div class="table-header-left">
      <span class="glow-dot amber"></span>
      <span class="table-header-title">TABLE ${index + 1}</span>
      <span class="tag tag-amber">${table.rowCount ?? sortedRows.length}R × ${table.columnCount ?? (sortedRows[0]?.length ?? 0)}C</span>
    </div>
    <span class="table-toggle">▼</span>
  `;

  // Table scroll wrapper
  const scrollWrap = document.createElement("div");
  scrollWrap.className = "table-scroll";

  const tbl = document.createElement("table");
  tbl.className = "data-table";

  const tbody = document.createElement("tbody");

  sortedRows.forEach((row, ri) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      const isHeader = cell.kind === "columnHeader" || ri === 0;
      td.className = isHeader ? "cell-header" : "cell-body";
      td.colSpan = cell.columnSpan ?? 1;
      td.rowSpan = cell.rowSpan  ?? 1;
      td.textContent = cell.content ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  scrollWrap.appendChild(tbl);
  block.appendChild(header);
  block.appendChild(scrollWrap);
  DOM.tablesContainer.appendChild(block);

  // Collapse toggle
  let collapsed = false;
  header.addEventListener("click", () => {
    collapsed = !collapsed;
    scrollWrap.style.display = collapsed ? "none" : "";
    header.querySelector(".table-toggle").textContent = collapsed ? "▶" : "▼";
  });
}

// ══ Tab switching ═══════════════════════════════════════════════════════════
function switchTab(tabKey) {
  DOM.tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabKey);
  });

  const panes = {
    text:   DOM.paneText,
    tables: DOM.paneTables,
    kv:     DOM.paneKV,
    raw:    DOM.paneRaw,
  };

  Object.entries(panes).forEach(([key, pane]) => {
    if (key === tabKey) {
      pane.classList.remove("hidden");
    } else {
      pane.classList.add("hidden");
    }
  });
}

// ══ Reset ══════════════════════════════════════════════════════════════════
function reset() {
  clearTimeout(state.pollTimer);
  state.result    = null;
  state.pollCount = 0;

  setStatus("idle");
  setAnalyzeUI(false);
  clearLogs();

  DOM.resultsPanel.classList.add("hidden");
  DOM.emptyState.classList.remove("hidden");
  DOM.btnReset.classList.add("hidden");
  DOM.confidenceBox.classList.add("hidden");
  DOM.progressFill.style.width = "0%";

  // Reset stats
  ["statPages","statTables","statKV","statWords"].forEach((id) => {
    $(id).textContent = "0";
  });

  // Show config
  DOM.configPanel.classList.remove("hidden");
  state.configVisible = true;
  DOM.btnToggleConfig.textContent = "▲ HIDE CONFIG";
}

// ══ Helpers ════════════════════════════════════════════════════════════════
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emptyMsg(html) {
  return `<div style="text-align:center;padding:40px;color:var(--muted);font-family:var(--font-mono);font-size:12px;line-height:1.8;">${html}</div>`;
}

// ══ Event listeners ════════════════════════════════════════════════════════

// Analyze
DOM.btnAnalyze.addEventListener("click", analyze);

// Enter key on inputs
[DOM.inputEndpoint, DOM.inputApiKey, DOM.inputDocUrl].forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyze();
  });
});

// Reset
DOM.btnReset.addEventListener("click", reset);

// Tabs
DOM.tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Copy JSON
DOM.btnCopyJson.addEventListener("click", () => {
  if (!state.result) return;
  navigator.clipboard.writeText(JSON.stringify(state.result, null, 2)).then(() => {
    DOM.btnCopyJson.textContent = "COPIED ✓";
    setTimeout(() => { DOM.btnCopyJson.textContent = "COPY JSON"; }, 2000);
  });
});

// Toggle config
DOM.btnToggleConfig.addEventListener("click", () => {
  state.configVisible = !state.configVisible;
  DOM.configPanel.classList.toggle("hidden", !state.configVisible);
  DOM.btnToggleConfig.textContent = state.configVisible ? "▲ HIDE CONFIG" : "▼ SHOW CONFIG";
});

// Input focus highlight (wrappers)
document.querySelectorAll(".input-wrap").forEach((wrap) => {
  const input = wrap.querySelector("input");
  if (!input) return;
  input.addEventListener("focus", () => wrap.classList.add("focused"));
  input.addEventListener("blur",  () => wrap.classList.remove("focused"));
});