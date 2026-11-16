import { redirect } from "next/navigation";

// trang kỳ thi của học sinh đã gộp vào trang chủ, giữ đường dẫn cũ cho ai còn lưu
export default function MyExamsPage() {
  redirect("/home");
}
