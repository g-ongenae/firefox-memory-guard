"use strict";

const params = new URLSearchParams(location.search);
const url = params.get("url") || "";
const title = params.get("title") || url;
const mem = Number(params.get("mem"));

document.title = `💤 ${title}`;
document.getElementById("title").textContent = title;
document.getElementById("info").textContent =
  `Unloaded by Memory Guard${mem ? ` (was using ${(mem / 1024 ** 3).toFixed(2)} GB)` : ""}. ${url}`;

const reload = document.getElementById("reload");
// Only navigate to regular web/file pages, never to javascript: or other schemes.
if (/^(https?|file):/i.test(url)) {
  reload.addEventListener("click", () => location.replace(url));
} else {
  reload.disabled = true;
}
