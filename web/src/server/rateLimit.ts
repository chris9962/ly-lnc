const MAX_FAILS = 8;
const WINDOW_MS = 10 * 60 * 1000;

const fails = new Map<string, { count: number; first: number }>();

// khoá theo cặp địa chỉ và tên đăng nhập, để học sinh không cố tình nhập sai nhằm khoá tài khoản của bạn khác
export const loginKey = (ip: string, username: string) => `${ip}|${username.toLowerCase()}`;

export function secondsBlocked(key: string): number {
  const entry = fails.get(key);
  if (!entry) return 0;
  const left = entry.first + WINDOW_MS - Date.now();
  if (left <= 0) {
    fails.delete(key);
    return 0;
  }
  return entry.count >= MAX_FAILS ? Math.ceil(left / 1000) : 0;
}

export function recordFail(key: string) {
  const entry = fails.get(key);
  if (!entry || entry.first + WINDOW_MS < Date.now()) fails.set(key, { count: 1, first: Date.now() });
  else entry.count++;
  if (fails.size > 10_000) for (const [k, v] of fails) if (v.first + WINDOW_MS < Date.now()) fails.delete(k);
}

export const clearFails = (key: string) => fails.delete(key);
