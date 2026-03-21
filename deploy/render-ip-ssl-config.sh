#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <public-ip>"
  exit 1
fi

PUBLIC_IP="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/generated"

mkdir -p "$OUTPUT_DIR"
sed "s/__PUBLIC_IP__/${PUBLIC_IP}/g" \
  "$SCRIPT_DIR/nginx-ip-ssl.conf.template" \
  > "$OUTPUT_DIR/ip-https.conf"

echo "Generated $OUTPUT_DIR/ip-https.conf for $PUBLIC_IP"
