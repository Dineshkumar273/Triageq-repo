#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_DIR"
docker compose -f docker-compose.https-ip.yml exec -T web nginx -s reload || \
  docker compose -f docker-compose.https-ip.yml restart web
