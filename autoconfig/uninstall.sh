#!/bin/sh
# Removes Memory Guard from Firefox.app. Restart Firefox afterwards.
APP="${1:-/Applications/Firefox.app}"
RES="$APP/Contents/Resources"
rm -f "$RES/defaults/pref/autoconfig.js" "$RES/mozilla.cfg"
rmdir "$RES/defaults/pref" "$RES/defaults" 2>/dev/null
echo "Removed from $APP. Quit and reopen Firefox."
