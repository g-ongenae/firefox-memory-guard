# Firefox Memory Guard

Warns when a Firefox page uses too much memory (default: more than 1 GB for its content process)
and offers to unload or close it. Memory figures are the same ones `about:processes` shows.

There are two versions, because regular Firefox gives extensions no way to read per-tab memory:

| Folder | What it is | Works on |
|---|---|---|
| [`autoconfig/`](autoconfig/) | AutoConfig script (`mozilla.cfg`) that shows a warning bar on heavy tabs | **Regular Firefox** (tested on 158) |
| [`extension/`](extension/) | WebExtension with a small experiment API that shows a pop-up inside the page | Firefox Developer Edition, Nightly or ESR only |

Regular Firefox rejects the extension as "corrupt" because it uses `experiment_apis`.
Use the `autoconfig/` version there. Each folder's README has install steps.
