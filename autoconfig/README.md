# Memory Guard (AutoConfig version, works on regular Firefox)

Shows a warning bar at the top of a page when its content process uses more than **1 GB**.
The memory figures are the same ones `about:processes` shows.

- **On the heavy tab:** "This page is using X GB…" with *Unload page*, *Close tab* and *Ignore for 10 min*.
- **On the tab you're viewing**, when the heavy tab is in the background: "Background tab using too much
  memory: …" with *Unload it/them*, *Show* and *Ignore for 10 min*.

*Unload* discards the tab. It stays in the tab bar and reloads when you click it.

## Install / uninstall

    ./install.sh      # copies autoconfig.js + mozilla.cfg into /Applications/Firefox.app
    ./uninstall.sh

Then quit Firefox completely (⌘Q) and reopen it.

Firefox updates may delete these files. If the warnings stop appearing after an update, run `./install.sh` again.

## Settings (about:config, optional)

| Pref | Type | Default |
|---|---|---|
| `memoryguard.thresholdMB` | number | 1024 |
| `memoryguard.pollSeconds` | number | 5 (applies after restart) |
| `memoryguard.snoozeMinutes` | number | 10 |
| `memoryguard.debug` | boolean | false: logs every check to the Browser Console (⌘⇧J) |

## How it works

Firefox runs `mozilla.cfg` at startup with full browser access (AutoConfig). Every few seconds it calls
`ChromeUtils.requestProcInfo()` and maps each tab, including its out-of-process iframes, to its content
processes. Then it shows or clears the warning bars. Up to 4 tabs from the same site can share one process,
and the warning says so, because unloading just one of them may not free the memory.
