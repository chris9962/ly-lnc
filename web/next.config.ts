import type { NextConfig } from "next";

// Mọi trang đều cần đăng nhập và đọc dữ liệu theo từng người dùng, nên không dùng Cache Components:
// trang nào đọc cookie thì tự động được render theo từng request.
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
