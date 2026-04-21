#!/usr/bin/env bash
# Installs the native messaging host manifest for Chrome / Chromium on Linux.
# Usage: ./install.sh <extension-id>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <extension-id>" >&2
  echo "  (load the unpacked extension in chrome://extensions first," >&2
  echo "   then copy its ID here)" >&2
  exit 1
fi

EXT_ID="$1"
HOST_NAME="com.resume_generator.host"
HERE="$(cd "$(dirname "$0")" && pwd)"
HOST_JS="$HERE/host.js"

chmod +x "$HOST_JS"

MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Resume Generator native host",
  "path": "$HOST_JS",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXT_ID/"
  ]
}
EOF
)

for dir in \
  "$HOME/.config/google-chrome/NativeMessagingHosts" \
  "$HOME/.config/chromium/NativeMessagingHosts"; do
  mkdir -p "$dir"
  printf '%s\n' "$MANIFEST" > "$dir/$HOST_NAME.json"
  echo "Wrote $dir/$HOST_NAME.json"
done

echo "Done. Restart Chrome so it picks up the manifest."
