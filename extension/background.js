"use strict";

const DEFAULTS = { thresholdMB: 1024, pollSeconds: 5, snoozeMinutes: 10 };
const MB = 1024 * 1024;

let settings = { ...DEFAULTS };
let lastReport = { rows: [], totalBytes: 0, at: 0, error: null };
const snoozedUntil = new Map(); // tabId -> timestamp
let overlayTabId = null;
let lastNotifiedKey = "";
let timer = null;

async function loadSettings() {
  settings = { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
}

function startPolling() {
  clearInterval(timer);
  timer = setInterval(poll, settings.pollSeconds * 1000);
  poll();
}

async function poll() {
  const tabs = await browser.tabs.query({});
  let report;
  try {
    report = await browser.processMemory.getTabMemory();
  } catch (e) {
    lastReport = { ...lastReport, error: String(e) };
    console.error("Memory Guard:", e);
    return;
  }

  const now = Date.now();
  for (const [tabId, until] of snoozedUntil) {
    if (until <= now) snoozedUntil.delete(tabId);
  }

  // Tabs the extension cannot see (e.g. private windows) are dropped here.
  const tabById = new Map(tabs.map(t => [t.id, t]));
  const rows = report.tabs
    .filter(r => tabById.has(r.tabId))
    .map(r => {
      const tab = tabById.get(r.tabId);
      const heaviest = r.processes.reduce((a, b) => (b.memory > a.memory ? b : a));
      return {
        tabId: r.tabId,
        title: tab.title,
        url: tab.url,
        memory: heaviest.memory,
        sharedBy: heaviest.tabCount,
        snoozed: snoozedUntil.has(r.tabId),
      };
    })
    .sort((a, b) => b.memory - a.memory);

  lastReport = { rows, totalBytes: report.totalBytes, at: now, error: null };

  const limit = settings.thresholdMB * MB;
  const heavy = rows.filter(r => r.memory >= limit);
  updateBadge(heavy.length);
  await showWarning(heavy.filter(r => !r.snoozed));
}

function updateBadge(count) {
  browser.browserAction.setBadgeText({ text: count ? String(count) : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#e5484d" });
}

async function sendToTab(tabId, message) {
  try {
    await browser.tabs.sendMessage(tabId, message);
    return true;
  } catch (e) {
    // No content script yet (page loaded before the extension): inject it on demand.
  }
  try {
    await browser.tabs.executeScript(tabId, { file: "content.js" });
    await browser.tabs.sendMessage(tabId, message);
    return true;
  } catch (e) {
    return false; // about:, addons.mozilla.org, extension pages… cannot be scripted.
  }
}

// The warning is shown in the page the user is currently looking at,
// and lists every heavy tab (including background ones).
async function showWarning(heavy) {
  const [active] = await browser.tabs.query({ active: true, lastFocusedWindow: true });

  if (overlayTabId !== null && (!heavy.length || overlayTabId !== active?.id)) {
    sendToTab(overlayTabId, { type: "hide" });
    overlayTabId = null;
  }
  if (!heavy.length) {
    lastNotifiedKey = "";
    return;
  }
  if (!active) return;

  const message = {
    type: "show",
    thresholdMB: settings.thresholdMB,
    snoozeMinutes: settings.snoozeMinutes,
    tabs: heavy.map(h => ({ ...h, isCurrent: h.tabId === active.id })),
  };
  if (await sendToTab(active.id, message)) {
    overlayTabId = active.id;
    return;
  }

  // Fallback for pages that cannot host the in-page warning: a system notification,
  // only when the set of heavy tabs changes so it does not repeat every poll.
  const key = heavy.map(h => h.tabId).join(",");
  if (key !== lastNotifiedKey) {
    lastNotifiedKey = key;
    browser.notifications.create("memory-guard", {
      type: "basic",
      iconUrl: "icon.svg",
      title: "High memory usage",
      message: heavy.map(h => `${formatGB(h.memory)} — ${h.title}`).join("\n"),
    });
  }
}

function formatGB(bytes) {
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

async function unloadTab(tabId) {
  const tab = await browser.tabs.get(tabId);
  if (!tab.active) {
    try {
      await browser.tabs.discard(tabId);
      return;
    } catch (e) {
      // Fall through and replace the page instead.
    }
  }
  // The active tab cannot be discarded: replace the page with a lightweight placeholder,
  // which lets Firefox release the old content process.
  const row = lastReport.rows.find(r => r.tabId === tabId);
  const params = new URLSearchParams({
    url: tab.url,
    title: tab.title || "",
    mem: row ? String(row.memory) : "",
  });
  await browser.tabs.update(tabId, { url: `${browser.runtime.getURL("unloaded.html")}?${params}` });
}

browser.runtime.onMessage.addListener(async message => {
  switch (message.type) {
    case "getReport":
      return { ...lastReport, settings };
    case "unload":
      await unloadTab(message.tabId);
      break;
    case "close":
      await browser.tabs.remove(message.tabId);
      break;
    case "snooze":
      for (const tabId of message.tabIds) {
        snoozedUntil.set(tabId, Date.now() + settings.snoozeMinutes * 60 * 1000);
      }
      break;
    default:
      return undefined;
  }
  poll();
  return undefined;
});

browser.tabs.onActivated.addListener(() => poll());
browser.tabs.onRemoved.addListener(tabId => {
  snoozedUntil.delete(tabId);
  if (overlayTabId === tabId) overlayTabId = null;
});
browser.storage.onChanged.addListener(() => loadSettings().then(startPolling));

loadSettings().then(startPolling);
