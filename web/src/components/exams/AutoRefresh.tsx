"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// trong giờ thi bảng theo dõi tự tải lại; tab ẩn thì thôi để đỡ tải cho máy chủ
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

// làm mới trang đúng lúc một mốc giờ đã biết trôi qua, ví dụ lúc kỳ thi bắt đầu
export function RefreshAt({ at }: { at: number | null }) {
  const router = useRouter();
  useEffect(() => {
    if (at === null) return;
    const delay = at - Date.now() + 1000;
    // setTimeout chỉ nhận tối đa khoảng 24 ngày
    if (delay <= 0 || delay > 2 ** 31 - 1) return;
    const timer = setTimeout(() => router.refresh(), delay);
    return () => clearTimeout(timer);
  }, [at, router]);
  return null;
}
