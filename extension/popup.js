"use strict";

const input = document.getElementById("threshold");
const summary = document.getElementById("summary");
const table = document.getElementById("tabs");

const gb = bytes => `${(bytes / 1024 ** 3).toFixed(2)} GB`;

async function refresh() {
  const report = await browser.runtime.sendMessage({ type: "getReport" });
  if (document.activeElement !== input) input.value = report.settings.thresholdMB;

  if (report.error) {
    summary.className = "error";
    summary.textContent = `Cannot read process memory: ${report.error}`;
    return;
  }
  summary.className = "muted";
  summary.textContent = `Firefox total: ${gb(report.totalBytes)}`;

  const limit = report.settings.thresholdMB * 1024 * 1024;
  table.replaceChildren(
    ...report.rows.map(r => {
      const tr = document.createElement("tr");
      const title = document.createElement("td");
      title.className = "t";
      title.title = r.url;
      title.textContent = (r.snoozed ? "💤 " : "") + (r.title || r.url);
      const mem = document.createElement("td");
      mem.className = "m" + (r.memory >= limit ? " heavy" : "");
      mem.textContent = gb(r.memory) + (r.sharedBy > 1 ? ` (×${r.sharedBy})` : "");
      mem.title = r.sharedBy > 1 ? `Process shared by ${r.sharedBy} tabs` : "";
      tr.append(title, mem);
      return tr;
    })
  );
}

input.addEventListener("change", () => {
  const value = Number(input.value);
  if (value >= 100) browser.storage.local.set({ thresholdMB: value });
});

refresh();
setInterval(refresh, 2000);
