import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { AnswerValue, Box, QuestionShape } from "@/lib/paperLayout";
import type { ScoringRules } from "@/lib/scoring";

type PageSize = { width: number; height: number };

export const users = sqliteTable(
  "users",
  {
    // AUTOINCREMENT để id không bị cấp lại sau khi xoá, audit_log vẫn chỉ đúng tài khoản cũ
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    // họ tên không dấu viết thường, phục vụ tìm kiếm không phân biệt dấu
    searchName: text("search_name").notNull(),
    role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
    grade: integer("grade"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(true),
    disabled: integer("disabled", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("users_role_grade_idx").on(table.role, table.grade)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at").notNull(),
    actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    // không đặt khoá ngoại: bản ghi audit phải còn sau khi đối tượng bị xoá
    targetId: integer("target_id"),
    detail: text("detail"),
  },
  (table) => [index("audit_log_target_idx").on(table.targetType, table.targetId), index("audit_log_at_idx").on(table.at)],
);

export const folders = sqliteTable(
  "folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    // xoá thư mục cha khi còn thư mục con bị chặn ở tầng nghiệp vụ, khoá ngoại giữ thêm một lớp
    parentId: integer("parent_id").references((): AnySQLiteColumn => folders.id, { onDelete: "restrict" }),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("folders_parent_idx").on(table.parentId)],
);

export const papers = sqliteTable(
  "papers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    searchTitle: text("search_title").notNull(),
    grade: integer("grade").notNull(),
    folderId: integer("folder_id").references(() => folders.id, { onDelete: "set null" }),
    format: text("format", { enum: ["thpt", "vsat"] }).notNull(),
    // thang điểm lưu theo từng đề để sửa được mà không đổi mã
    scoring: text("scoring", { mode: "json" }).$type<ScoringRules>().notNull(),
    pageSizes: text("page_sizes", { mode: "json" }).$type<PageSize[]>().notNull(),
    warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull(),
    questionCount: integer("question_count").notNull().default(0),
    keyedCount: integer("keyed_count").notNull().default(0),
    // tăng mỗi lần cắt lại ảnh, đường dẫn ảnh mang số này để trình duyệt không giữ ảnh cũ
    imageVersion: integer("image_version").notNull().default(1),
    sourceName: text("source_name").notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("papers_grade_idx").on(table.grade), index("papers_folder_idx").on(table.folderId)],
);

export const paperContexts = sqliteTable(
  "paper_contexts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    paperId: integer("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    count: integer("count").notNull(),
    boxes: text("boxes", { mode: "json" }).$type<Box[]>().notNull(),
    imageWidth: integer("image_width").notNull(),
    imageHeight: integer("image_height").notNull(),
  },
  (table) => [uniqueIndex("paper_contexts_seq_idx").on(table.paperId, table.seq)],
);

export const paperQuestions = sqliteTable(
  "paper_questions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    paperId: integer("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    // thứ tự câu trong đề, bài làm lưu theo số này
    seq: integer("seq").notNull(),
    // số ghi trên đề, đề THPT đánh lại từ 1 ở mỗi phần
    label: integer("label"),
    shape: text("shape", { mode: "json" }).$type<QuestionShape>().notNull(),
    answerKey: text("answer_key", { mode: "json" }).$type<AnswerValue | null>(),
    boxes: text("boxes", { mode: "json" }).$type<Box[]>().notNull(),
    contextSeq: integer("context_seq"),
    imageWidth: integer("image_width").notNull(),
    imageHeight: integer("image_height").notNull(),
  },
  (table) => [uniqueIndex("paper_questions_seq_idx").on(table.paperId, table.seq)],
);

export const exams = sqliteTable(
  "exams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    searchTitle: text("search_title").notNull(),
    grade: integer("grade").notNull(),
    startsAt: integer("starts_at").notNull(),
    endsAt: integer("ends_at").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    // học sinh xem đáp án ngay khi nộp bài, hoặc chờ tới giờ kết thúc kỳ thi
    answersAt: text("answers_at", { enum: ["submit", "end"] }).notNull().default("end"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("exams_grade_idx").on(table.grade, table.startsAt)],
);

// mỗi dòng là một mã đề của kỳ thi, hiện mỗi kỳ thi một dòng
export const examPapers = sqliteTable(
  "exam_papers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    examId: integer("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    paperId: integer("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "restrict" }),
    code: text("code").notNull().default(""),
  },
  (table) => [index("exam_papers_exam_idx").on(table.examId), index("exam_papers_paper_idx").on(table.paperId)],
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // trống nghĩa là thi thử của giáo viên
    examId: integer("exam_id").references(() => exams.id, { onDelete: "cascade" }),
    paperId: integer("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: integer("started_at").notNull(),
    deadline: integer("deadline"),
    submittedAt: integer("submitted_at"),
    score: real("score"),
    maxScore: real("max_score").notNull(),
    reopenCount: integer("reopen_count").notNull().default(0),
  },
  // NULL không trùng nhau trong chỉ mục duy nhất, nên thi thử làm nhiều lần được
  (table) => [uniqueIndex("attempts_exam_user_idx").on(table.examId, table.userId), index("attempts_user_idx").on(table.userId), index("attempts_paper_idx").on(table.paperId)],
);

export const attemptAnswers = sqliteTable(
  "attempt_answers",
  {
    attemptId: integer("attempt_id")
      .notNull()
      .references(() => attempts.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    value: text("value", { mode: "json" }).$type<AnswerValue | null>(),
    savedAt: integer("saved_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.attemptId, table.seq] })],
);
