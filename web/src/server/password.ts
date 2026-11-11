import { randomBytes, randomInt, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key))));

const encode = (salt: Buffer, key: Buffer) => `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return encode(salt, await derive(password, salt));
}

// bản đồng bộ chỉ dùng khi khởi tạo database, nơi không gọi được hàm bất đồng bộ trong transaction
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  return encode(salt, scryptSync(password, salt, KEY_LENGTH));
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, saltHex, keyHex] = stored.split("$");
  if (algorithm !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await derive(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// so sánh với hash giả khi tên đăng nhập không tồn tại, để thời gian phản hồi không lộ tài khoản nào có thật
export const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(KEY_LENGTH * 2)}`;

// bỏ các ký tự dễ đọc nhầm trên giấy: 0/o, 1/l/i
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function randomPassword(length = 8): string {
  let password = "";
  for (let i = 0; i < length; i++) password += ALPHABET[randomInt(ALPHABET.length)];
  return password;
}
