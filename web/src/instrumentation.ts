export async function register() {
  // mở database ngay khi máy chủ khởi động, để file mật khẩu admin ban đầu có trước lần đăng nhập đầu tiên
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./server/db");
    getDb();
  }
}
