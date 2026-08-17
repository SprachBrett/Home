#!/usr/bin/env bash
# ============================================================
# build.sh — Vor jedem Push einmal ausführen!
#
# Setzt automatisch einen neuen Cache-Buster-Zeitstempel
# (?v=<Unix-Zeit>) in index.html (Script- UND CSS-Tag) und alle
# *.js-Importe, damit GitHub Pages/Browser nach einem Update
# garantiert die neuen Dateien laden statt eine alte Version aus
# dem Cache zu zeigen.
#
# Nutzung:
#   ./build.sh
#   git add -A && git commit -m "update" && git push
# ============================================================
set -e
cd "$(dirname "$0")"

OLD_V=$(grep -oE 'v=[0-9]{10}' index.html | head -1 | cut -d= -f2)
NEW_V=$(date +%s)

if [ -z "$OLD_V" ]; then
  echo "Kein bestehender Cache-Buster gefunden — nichts zu tun. Prüfe index.html manuell."
  exit 1
fi

echo "Cache-Buster: $OLD_V -> $NEW_V"

# index.html (Haupt-<script>-Tag)
sed -i.bak "s/v=$OLD_V/v=$NEW_V/g" index.html && rm index.html.bak

# Alle internen JS-Importe
for f in *.js; do
  sed -i.bak "s/v=$OLD_V/v=$NEW_V/g" "$f" && rm "${f}.bak"
done

echo "Fertig. Jetzt committen und pushen."
