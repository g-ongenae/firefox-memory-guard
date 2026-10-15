"use strict";

// Guard against double injection (manifest-less, injected on demand by the background).
if (!window.__memoryGuardLoaded) {
  window.__memoryGuardLoaded = true;

  let host = null;
  let root = null;

  const STYLE = `
    :host { all: initial; }
    .card {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      width: min(380px, calc(100vw - 32px));
      font: 13px/1.4 system-ui, -apple-system, sans-serif;
      color: #1c1c1e; background: #fff;
      border: 1px solid #e5484d; border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,.25); overflow: hidden;
    }
    @media (prefers-color-scheme: dark) {
      .card { color: #f2f2f2; background: #2b2a33; }
      .row { border-color: #44434d !important; }
      button.secondary { background: #3a3944; color: #f2f2f2; }
    }
    header { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
      background: #e5484d; color: #fff; font-weight: 600; }
    header span { flex: 1; }
    .x { background: none; border: 0; color: #fff; font-size: 18px; cursor: pointer; padding: 0 4px; }
    .intro { padding: 10px 12px 4px; }
    .row { padding: 8px 12px; border-top: 1px solid #eee; }
    .title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { opacity: .75; font-size: 12px; margin: 2px 0 6px; }
    .mem { color: #e5484d; font-weight: 700; }
    .actions { display: flex; gap: 6px; }
    button { font: inherit; border-radius: 6px; padding: 4px 10px; cursor: pointer; border: 0; }
    button.primary { background: #e5484d; color: #fff; }
    button.secondary { background: #eee; color: #1c1c1e; }
    footer { padding: 8px 12px 10px; text-align: right; }
  `;

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    node.append(...children);
    return node;
  }

  function send(message) {
    browser.runtime.sendMessage(message);
  }

  function hide() {
    host?.remove();
    host = root = null;
  }

  function render({ tabs, thresholdMB, snoozeMinutes }) {
    if (!host || !host.isConnected) {
      host = document.createElement("memory-guard-warning");
      root = host.attachShadow({ mode: "closed" });
      document.documentElement.append(host);
    }
    root.replaceChildren();

    const snoozeAll = () => send({ type: "snooze", tabIds: tabs.map(t => t.tabId) });

    const rows = tabs.map(t => {
      const gb = (t.memory / 1024 ** 3).toFixed(2);
      const notes = [];
      if (t.isCurrent) notes.push("this tab");
      if (t.sharedBy > 1) notes.push(`process shared with ${t.sharedBy - 1} other tab(s)`);
      return el("div", { className: "row" }, [
        el("div", { className: "title", title: t.url, textContent: t.title || t.url }),
        el("div", { className: "meta" }, [
          el("span", { className: "mem", textContent: `${gb} GB` }),
          notes.length ? ` · ${notes.join(" · ")}` : "",
        ]),
        el("div", { className: "actions" }, [
          el("button", {
            className: "primary",
            textContent: "Unload",
            title: "Free the memory; the page can be reloaded later",
            onclick: () => send({ type: "unload", tabId: t.tabId }),
          }),
          el("button", {
            className: "secondary",
            textContent: "Close tab",
            onclick: () => send({ type: "close", tabId: t.tabId }),
          }),
        ]),
      ]);
    });

    const thresholdLabel = thresholdMB >= 1024 ? `${+(thresholdMB / 1024).toFixed(2)} GB` : `${thresholdMB} MB`;
    root.append(
      el("style", { textContent: STYLE }),
      el("div", { className: "card", role: "alertdialog" }, [
        el("header", {}, [
          el("span", { textContent: "⚠ High memory usage" }),
          el("button", { className: "x", textContent: "×", title: `Ignore for ${snoozeMinutes} min`, onclick: snoozeAll }),
        ]),
        el("div", {
          className: "intro",
          textContent: `${tabs.length === 1 ? "This page uses" : "These pages use"} more than ${thresholdLabel}. Stop it before Firefox runs out of memory?`,
        }),
        ...rows,
        el("footer", {}, [
          el("button", { className: "secondary", textContent: `Ignore for ${snoozeMinutes} min`, onclick: snoozeAll }),
        ]),
      ])
    );
  }

  browser.runtime.onMessage.addListener(message => {
    if (message.type === "show") render(message);
    else if (message.type === "hide") hide();
  });
}
