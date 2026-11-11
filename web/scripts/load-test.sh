#!/usr/bin/env bash
# Thử tải trên bản build production với thư mục dữ liệu tạm, không đụng dữ liệu thật.
# Cần chạy `bun run build` trước. Đổi số học sinh: LOAD_STUDENTS=300 bun run load
set -euo pipefail
cd "$(dirname "$0")/.."

export LOAD_PORT="${LOAD_PORT:-3212}"
export LOAD_BASE="http://127.0.0.1:$LOAD_PORT"
export DATA_DIR="$(mktemp -d)"

bunx next start -p "$LOAD_PORT" -H 127.0.0.1 >"$DATA_DIR/server.log" 2>&1 &
SERVER_PID=$!
stop() {
  kill "$SERVER_PID" 2>/dev/null || true
  # trên Windows tiến trình node con có thể còn sống sau khi shell cha bị dừng
  if command -v taskkill >/dev/null 2>&1; then
    for pid in $(netstat -ano 2>/dev/null | grep "127.0.0.1:$LOAD_PORT " | grep LISTENING | awk '{print $NF}' | sort -u); do
      taskkill //PID "$pid" //F >/dev/null 2>&1 || true
    done
  fi
}
trap stop EXIT

for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "$LOAD_BASE/login"; then break; fi
  sleep 1
done

node scripts/load-test.mjs
echo "Nhật ký máy chủ: $DATA_DIR/server.log"
