import { describe, expect, it } from "vitest";
import { baseUsername, searchKey } from "@/lib/username";

describe("baseUsername", () => {
  it("ghép tên gọi với chữ cái đầu của họ và tên đệm, bỏ dấu", () => {
    expect(baseUsername("Nguyễn Văn An")).toBe("annv");
    expect(baseUsername("Trần Thị Bình")).toBe("binhtt");
    expect(baseUsername("Lâm Ngọc Cớm")).toBe("comln");
  });

  it("đổi đ thành d", () => {
    expect(baseUsername("Đỗ Đức Đạt")).toBe("datdd");
  });

  it("bỏ khoảng trắng thừa và ký tự lạ", () => {
    expect(baseUsername("  Lê   Thị  Hoa. ")).toBe("hoalt");
  });

  it("tên một chữ thì giữ nguyên", () => {
    expect(baseUsername("An")).toBe("an");
  });

  it("chuỗi không có chữ nào thì dùng tên mặc định", () => {
    expect(baseUsername("!!!")).toBe("user");
  });
});

describe("searchKey", () => {
  it("bỏ dấu và viết thường để tìm không phân biệt dấu", () => {
    expect(searchKey("Trần Thị Bình")).toBe("tran thi binh");
    expect(searchKey("  ĐỖ  Đức ")).toBe("do duc");
  });
});
