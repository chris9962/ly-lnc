export async function register() {
  // mở database ngay khi máy chủ khởi động, để file mật khẩu admin ban đầu có trước lần đăng nhập đầu tiên
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("./server/db");
    getDb();
    // test E2E và thử tải đặt SEED_PAPERS=0 để bắt đầu với ngân hàng đề trống
    if (process.env.SEED_PAPERS !== "0") {
      const { seedPapers } = await import("./server/seed");
      await seedPapers().catch((error) => console.error("Không nạp được bộ đề có sẵn", error));
    }
  }
}
