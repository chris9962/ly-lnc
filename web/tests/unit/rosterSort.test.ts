import { describe, expect, it } from "vitest";
import { rosterQuery } from "@/lib/examForm";
import { nextSort, sortRoster, type RosterSortRow } from "@/lib/rosterSort";

const row = (userId: number, fullName: string, status: RosterSortRow["status"], score: number | null): RosterSortRow => ({ userId, fullName, status, score });

const rows = [
  row(1, "Trần Hữu Trí", "absent", null),
  row(2, "Nguyễn Tài Lọc", "submitted", 60),
  row(3, "Lâm Ngọc Cớm", "working", null),
  row(4, "Nguyễn Nhựt Trường", "submitted", 43),
  row(5, "Đỗ Văn An", "submitted", 60),
];

const ids = (list: RosterSortRow[]) => list.map((item) => item.userId);

describe("sortRoster", () => {
  it("sắp theo họ tên không phân biệt dấu, hai chiều", () => {
    expect(ids(sortRoster(rows, "name", "asc"))).toEqual([5, 3, 4, 2, 1]);
    expect(ids(sortRoster(rows, "name", "desc"))).toEqual([1, 2, 4, 3, 5]);
  });

  it("sắp theo điểm, bài chưa có điểm luôn nằm cuối ở cả hai chiều", () => {
    expect(ids(sortRoster(rows, "score", "desc"))).toEqual([5, 2, 4, 3, 1]);
    expect(ids(sortRoster(rows, "score", "asc"))).toEqual([4, 5, 2, 3, 1]);
  });

  it("sắp theo trạng thái: đã nộp, đang làm, chưa vào thi, cùng trạng thái thì theo họ tên", () => {
    expect(ids(sortRoster(rows, "status", "asc"))).toEqual([5, 4, 2, 3, 1]);
    expect(ids(sortRoster(rows, "status", "desc"))).toEqual([1, 3, 5, 4, 2]);
  });

  it("không sửa mảng gốc", () => {
    const before = ids(rows);
    sortRoster(rows, "score", "desc");
    expect(ids(rows)).toEqual(before);
  });
});

describe("nextSort", () => {
  it("bấm cột đang sắp thì đảo chiều", () => {
    expect(nextSort({ sort: "name", dir: "asc" }, "name")).toEqual({ sort: "name", dir: "desc" });
    expect(nextSort({ sort: "score", dir: "desc" }, "score")).toEqual({ sort: "score", dir: "asc" });
  });

  it("bấm cột khác thì họ tên bắt đầu tăng dần, điểm bắt đầu giảm dần", () => {
    expect(nextSort({ sort: "score", dir: "asc" }, "name")).toEqual({ sort: "name", dir: "asc" });
    expect(nextSort({ sort: "name", dir: "desc" }, "score")).toEqual({ sort: "score", dir: "desc" });
  });
});

describe("rosterQuery", () => {
  it("mặc định sắp theo họ tên tăng dần, giá trị lạ trên URL bị bỏ qua", () => {
    expect(rosterQuery.parse({})).toMatchObject({ sort: "name", dir: "asc" });
    expect(rosterQuery.parse({ sort: "score", dir: "desc" })).toMatchObject({ sort: "score", dir: "desc" });
    expect(rosterQuery.parse({ sort: "password", dir: "sideways" })).toMatchObject({ sort: "name", dir: "asc" });
  });
});
