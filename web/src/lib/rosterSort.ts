import { searchKey } from "./username";

export const ROSTER_SORTS = ["name", "status", "score"] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];
export type SortDir = "asc" | "desc";
export type RosterSortRow = { userId: number; fullName: string; status: "submitted" | "working" | "absent"; score: number | null };

const STATUS_ORDER: Record<RosterSortRow["status"], number> = { submitted: 0, working: 1, absent: 2 };

export function sortRoster<T extends RosterSortRow>(rows: T[], sort: RosterSort, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  const keyed = rows.map((row) => ({ row, name: searchKey(row.fullName) }));
  const byName = (a: (typeof keyed)[number], b: (typeof keyed)[number]) => a.name.localeCompare(b.name) || a.row.userId - b.row.userId;
  keyed.sort((a, b) => {
    if (sort === "name") return sign * byName(a, b);
    if (sort === "status") return sign * (STATUS_ORDER[a.row.status] - STATUS_ORDER[b.row.status]) || byName(a, b);
    // bài chưa có điểm nằm cuối ở cả hai chiều, để chiều tăng dần không mở đầu bằng một loạt dòng trống
    if (a.row.score === null || b.row.score === null) return Number(a.row.score === null) - Number(b.row.score === null) || byName(a, b);
    return sign * (a.row.score - b.row.score) || byName(a, b);
  });
  return keyed.map((item) => item.row);
}

export function nextSort(current: { sort: RosterSort; dir: SortDir }, column: RosterSort): { sort: RosterSort; dir: SortDir } {
  if (current.sort === column) return { sort: column, dir: current.dir === "asc" ? "desc" : "asc" };
  return { sort: column, dir: column === "score" ? "desc" : "asc" };
}
