#!/bin/sh
# Copies the audio, podcast cover and podcast feed from the current live deploy into dist/,
# so a new deploy does not break the "Listen" buttons or podcast subscribers.
# Source: the permanent link to the Sep 19 2026 deploy of somehowimanage.netlify.app.
set -e
cd "$(dirname "$0")/.."
SRC="https://6aae8b8470c940a9d9b067ae--somehowimanage.netlify.app"
mkdir -p dist/audio
ok=0; fail=0
for f in audio/dedication.mp3 audio/before.mp3 audio/s01.mp3 audio/s02.mp3 audio/s03.mp3 audio/s04.mp3 audio/s05.mp3 audio/s06.mp3 podcast-cover.jpg feed.xml; do
  if [ -s "dist/$f" ]; then ok=$((ok+1)); continue; fi
  if curl -fsSL --retry 3 -o "dist/$f.tmp" "$SRC/$f"; then mv "dist/$f.tmp" "dist/$f"; ok=$((ok+1)); else rm -f "dist/$f.tmp"; echo "could not copy $f"; fail=$((fail+1)); fi
done
echo "Legacy assets: $ok copied, $fail missing."
echo "warning: continuing without $fail missing legacy assets (source deploy is gone)"
exit 0
