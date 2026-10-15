#!/bin/sh
# Installs Memory Guard into Firefox.app. Restart Firefox afterwards.
set -e
APP="${1:-/Applications/Firefox.app}"
RES="$APP/Contents/Resources"
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -d "$RES" ] || { echo "Firefox not found at $APP"; exit 1; }
mkdir -p "$RES/defaults/pref"
cp "$HERE/defaults/pref/autoconfig.js" "$RES/defaults/pref/autoconfig.js"
cp "$HERE/mozilla.cfg" "$RES/mozilla.cfg"
echo "Installed into $APP. Quit and reopen Firefox to activate it."
