import "server-only";
import { and, asc, count, eq, like, or, type SQL } from "drizzle-orm";
import { can, manageAction, manageableRoles, type ManagedRole, type SessionUser } from "@/lib/permissions";
import { PAGE_SIZE, type CreateUsersInput, type ListUsersQuery, type UpdateUserInput } from "@/lib/userForm";
import { baseUsername, searchKey } from "@/lib/username";
import { writeAudit } from "./audit";
import { getDb, type Tx } from "./db";
import { users } from "./db/schema";
import { hashPassword, randomPassword } from "./password";
import { fail, FORBIDDEN, NOT_FOUND, ok, type Result } from "./result";
import { deleteSessionsOf } from "./session";

export type UserListItem = {
  id: number;
  username: string;
  fullName: string;
  role: "admin" | "teacher" | "student";
  grade: number | null;
  mustChangePassword: boolean;
  disabled: boolean;
  createdAt: number;
};

export type IssuedAccount = { fullName: string; username: string; password: string };

const listColumns = {
  id: users.id,
  username: users.username,
  fullName: users.fullName,
  role: users.role,
  grade: users.grade,
  mustChangePassword: users.mustChangePassword,
  disabled: users.disabled,
  createdAt: users.createdAt,
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

export function listUsers(user: SessionUser, query: ListUsersQuery): Result<{ rows: UserListItem[]; total: number; page: number; pageSize: number }> {
  if (!can(user, manageAction(query.role))) return FORBIDDEN;
  const db = getDb();

  const filters: (SQL | undefined)[] = [eq(users.role, query.role)];
  if (query.grade !== undefined) filters.push(eq(users.grade, query.grade));
  const key = searchKey(query.q);
  if (key) {
    const pattern = `%${escapeLike(key)}%`;
    filters.push(or(like(users.searchName, pattern), like(users.username, pattern)));
  }
  const where = and(...filters);

  const total = db.select({ n: count() }).from(users).where(where).get()?.n ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, lastPage);
  const rows = db
    .select(listColumns)
    .from(users)
    .where(where)
    .orderBy(asc(users.searchName), asc(users.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();
  return ok({ rows, total, page, pageSize: PAGE_SIZE });
}

function freeUsername(tx: Tx, base: string): string {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    if (!tx.select({ id: users.id }).from(users).where(eq(users.username, candidate)).get()) return candidate;
  }
}

export async function createUsers(user: SessionUser, input: CreateUsersInput): Promise<Result<{ issued: IssuedAccount[] }>> {
  if (!can(user, manageAction(input.role))) return FORBIDDEN;
  if (input.role === "student" && input.grade === null) return fail("Chọn khối", 400, "grade");

  // băm mật khẩu trước vì transaction của SQLite chạy đồng bộ, không chờ được hàm bất đồng bộ
  const prepared = await Promise.all(
    input.names.map(async (fullName) => {
      const password = randomPassword();
      return { fullName, password, passwordHash: await hashPassword(password) };
    }),
  );

  const issued = getDb().transaction((tx) =>
    prepared.map(({ fullName, password, passwordHash }) => {
      const username = freeUsername(tx, baseUsername(fullName));
      const created = tx
        .insert(users)
        .values({
          username,
          passwordHash,
          fullName,
          searchName: searchKey(fullName),
          role: input.role,
          grade: input.role === "student" ? input.grade : null,
          createdAt: Date.now(),
        })
        .returning({ id: users.id })
        .get();
      writeAudit(tx, user, "user.create", { type: "user", id: created.id }, { username, role: input.role, grade: input.grade });
      return { fullName, username, password };
    }),
  );
  return ok({ issued });
}

// tài khoản không tồn tại và tài khoản ngoài phạm vi trả cùng một kết quả, để không lộ id nào có thật
function findManaged(user: SessionUser, id: number) {
  if (!Number.isInteger(id)) return null;
  const target = getDb().select().from(users).where(eq(users.id, id)).get();
  if (!target || !manageableRoles(user).includes(target.role as ManagedRole)) return null;
  return target;
}

export async function resetPassword(user: SessionUser, id: number): Promise<Result<{ issued: IssuedAccount }>> {
  const target = findManaged(user, id);
  if (!target) return NOT_FOUND;

  const password = randomPassword();
  const passwordHash = await hashPassword(password);
  getDb().transaction((tx) => {
    tx.update(users).set({ passwordHash, mustChangePassword: true }).where(eq(users.id, id)).run();
    deleteSessionsOf(tx, id);
    writeAudit(tx, user, "user.reset_password", { type: "user", id }, { username: target.username });
  });
  return ok({ issued: { fullName: target.fullName, username: target.username, password } });
}

export function updateUser(user: SessionUser, id: number, input: UpdateUserInput): Result {
  const target = findManaged(user, id);
  if (!target) return NOT_FOUND;
  if (input.grade !== undefined && target.role !== "student") return fail("Chỉ học sinh mới có khối", 400, "grade");

  getDb().transaction((tx) => {
    if (input.disabled !== undefined && input.disabled !== target.disabled) {
      tx.update(users).set({ disabled: input.disabled }).where(eq(users.id, id)).run();
      if (input.disabled) deleteSessionsOf(tx, id);
      writeAudit(tx, user, input.disabled ? "user.disable" : "user.enable", { type: "user", id }, { username: target.username });
    }
    if (input.grade !== undefined && input.grade !== target.grade) {
      tx.update(users).set({ grade: input.grade }).where(eq(users.id, id)).run();
      writeAudit(tx, user, "user.change_grade", { type: "user", id }, { username: target.username, from: target.grade, to: input.grade });
    }
  });
  return ok();
}

export function deleteUser(user: SessionUser, id: number): Result {
  const target = findManaged(user, id);
  if (!target) return NOT_FOUND;

  getDb().transaction((tx) => {
    writeAudit(tx, user, "user.delete", { type: "user", id }, { username: target.username, fullName: target.fullName, role: target.role });
    tx.delete(users).where(eq(users.id, id)).run();
  });
  return ok();
}

export function countStudentsByGrade(user: SessionUser): Result<{ counts: Record<number, number> }> {
  if (!can(user, "students.manage")) return FORBIDDEN;
  const rows = getDb().select({ grade: users.grade, n: count() }).from(users).where(eq(users.role, "student")).groupBy(users.grade).all();
  return ok({ counts: Object.fromEntries(rows.map((row) => [row.grade ?? 0, row.n])) });
}
