# Memory Guard (Firefox)

Shows a warning inside the page you're viewing when a tab's content process uses more
than **1 GB** (configurable in the toolbar popup). From the warning you can:

- **Unload**: background tabs are discarded. The active tab is replaced with a light
  placeholder that has a "Reload page" button.
- **Close tab**
- **Ignore for 10 min**

The memory numbers come from `ChromeUtils.requestProcInfo()`, the same source as
`about:processes`, so they are real per-process figures, not estimates.

## Why it needs a WebExtension Experiment

The standard WebExtension APIs don't give per-tab memory in Firefox. The only accurate
source is privileged, so this add-on includes a small *experiment API* (`experiment/`).
Firefox loads experiment APIs only in **Developer Edition, Nightly, or ESR** (or unbranded
builds). Regular release Firefox refuses to load them.

## Install

1. Use Firefox Developer Edition / Nightly / ESR.
2. In `about:config`, set `extensions.experiments.enabled` to `true`.
3. **Temporary install** (removed when Firefox restarts): open `about:debugging#/runtime/this-firefox`,
   click *Load Temporary Add-on…*, then select `manifest.json`.
4. **Permanent install**: also set `xpinstall.signatures.required` to `false`, then run
   `cd firefox-memory-guard && zip -r ../memory-guard.xpi .` and open the `.xpi` in Firefox.

## Notes

- Firefox groups pages by site. Up to 4 tabs from the same site can share one process,
  so a shared process's memory shows on each of those tabs (marked "shared with N other tabs").
  Unloading one of them may not free the memory.
- Out-of-process iframes (ads, embeds) are counted too: a tab is flagged if any process it uses is over the limit.
- Pages that can't be scripted (`about:` pages, addons.mozilla.org) get a system notification instead.
