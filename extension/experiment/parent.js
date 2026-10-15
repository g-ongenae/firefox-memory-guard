"use strict";

/* global ExtensionAPI, ChromeUtils, Services */

const { ExtensionParent } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionParent.sys.mjs"
);

function osPidOf(windowGlobal) {
  if (!windowGlobal) {
    return null;
  }
  try {
    return windowGlobal.osPid ?? windowGlobal.domProcess?.osPid ?? null;
  } catch (e) {
    return null;
  }
}

this.processMemory = class extends ExtensionAPI {
  getAPI() {
    return {
      processMemory: {
        async getTabMemory() {
          const { tabTracker } = ExtensionParent.apiManager.global;
          if (!tabTracker) {
            throw new Error("tabTracker is not available yet");
          }

          // Same data as about:processes: one entry per content process.
          const info = await ChromeUtils.requestProcInfo();
          const procByPid = new Map();
          let totalBytes = info.memory;
          for (const child of info.children) {
            procByPid.set(child.pid, { memory: child.memory, origin: child.origin || child.type });
            totalBytes += child.memory;
          }

          // Map every tab (and its out-of-process iframes) to the processes it lives in.
          const tabs = [];
          const tabCountByPid = new Map();
          for (const win of Services.wm.getEnumerator("navigator:browser")) {
            for (const tab of win.gBrowser?.tabs ?? []) {
              const bc = tab.linkedBrowser?.browsingContext;
              // Discarded tabs have no linkedPanel and no content process.
              if (!bc || !tab.linkedPanel) {
                continue;
              }
              const pids = new Set();
              for (const sub of bc.getAllBrowsingContextsInSubtree()) {
                const pid = osPidOf(sub.currentWindowGlobal);
                if (pid && procByPid.has(pid)) {
                  pids.add(pid);
                }
              }
              if (!pids.size) {
                continue;
              }
              for (const pid of pids) {
                tabCountByPid.set(pid, (tabCountByPid.get(pid) || 0) + 1);
              }
              tabs.push({ tabId: tabTracker.getId(tab), pids: [...pids] });
            }
          }

          return {
            totalBytes,
            tabs: tabs.map(({ tabId, pids }) => ({
              tabId,
              processes: pids.map(pid => ({
                pid,
                memory: procByPid.get(pid).memory,
                origin: procByPid.get(pid).origin,
                tabCount: tabCountByPid.get(pid),
              })),
            })),
          };
        },
      },
    };
  }
};
