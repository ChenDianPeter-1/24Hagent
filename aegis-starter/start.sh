#!/bin/bash
set -euo pipefail

STARTER_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$STARTER_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

exec bash "$STARTER_DIR/setup.sh" "$@"
