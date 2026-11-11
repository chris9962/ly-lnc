import type { NextConfig } from "next";

// Mọi trang đều cần đăng nhập và đọc dữ liệu theo từng người dùng, nên không dùng Cache Components:
// trang nào đọc cookie thì tự động được render theo từng request.
const nextConfig: NextConfig = {
  // mupdf nạp file wasm và sharp nạp thư viện native từ thư mục của chúng, không gói vào bundle được
  serverExternalPackages: ["better-sqlite3", "mupdf", "sharp"],
};

export default nextConfig;
