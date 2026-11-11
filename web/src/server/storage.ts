import "server-only";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

const ROOT = path.join(DATA_DIR, "files");

// khoá chỉ gồm chữ thường, số, dấu gạch và dấu chấm, nên không thể trỏ ra ngoài thư mục lưu
const SAFE_KEY = /^[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*$/;

function resolve(key: string) {
  if (!SAFE_KEY.test(key) || key.includes("..")) throw new Error(`Khoá lưu trữ không hợp lệ: ${key}`);
  return path.join(ROOT, ...key.split("/"));
}

export async function putObject(key: string, data: Uint8Array) {
  const target = resolve(key);
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  // ghi ra file tạm rồi đổi tên để người đọc không bao giờ thấy file ghi dở
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(temp, data);
  await fs.promises.rename(temp, target);
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await fs.promises.readFile(resolve(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// xoá đồng bộ để thao tác xoá trả về là file đã thật sự biến mất
export function deletePrefix(prefix: string) {
  fs.rmSync(resolve(prefix), { recursive: true, force: true });
}

export const paperKeys = {
  root: (paperId: number) => `papers/${paperId}`,
  source: (paperId: number) => `papers/${paperId}/source.pdf`,
  page: (paperId: number, page: number) => `papers/${paperId}/pages/${page}.webp`,
  images: (paperId: number, version: number) => `papers/${paperId}/v${version}`,
  question: (paperId: number, version: number, seq: number) => `papers/${paperId}/v${version}/q${seq}.webp`,
  context: (paperId: number, version: number, seq: number) => `papers/${paperId}/v${version}/c${seq}.webp`,
};
