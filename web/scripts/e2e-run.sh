#!/usr/bin/env bash
# E2E chạy trên bản build production với thư mục dữ liệu tạm.
set -euo pipefail
cd "$(dirname "$0")/.."

export E2E_PORT="${E2E_PORT:-3210}"
export DATA_DIR="$(mktemp -d)"
export E2E_DATA_DIR="$DATA_DIR"

bun run build
bunx next start -p "$E2E_PORT" -H 127.0.0.1 >"$DATA_DIR/server.log" 2>&1 &
SERVER_PID=$!
stop() {
  kill "$SERVER_PID" 2>/dev/null || true
  # trên Windows tiến trình node con có thể còn sống sau khi shell cha bị dừng
  if command -v taskkill >/dev/null 2>&1; then
    for pid in $(netstat -ano 2>/dev/null | grep "127.0.0.1:$E2E_PORT " | grep LISTENING | awk '{print $NF}' | sort -u); do
      taskkill //PID "$pid" //F >/dev/null 2>&1 || true
    done
  fi
}
trap stop EXIT

for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$E2E_PORT/login"; then break; fi
  sleep 1
done

bunx playwright test "$@"
