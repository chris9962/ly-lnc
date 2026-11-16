"use client";

import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cx } from "@/components/ui/cx";
import { callApi } from "@/lib/api";
import { celebrationLevel, type CelebrationLevel } from "@/lib/examStats";
import { isComplete, isTouched, type AnswerValue } from "@/lib/paperLayout";
import { imageUrl, partTitle, partsOf, questionName } from "@/lib/paperView";
import type { AttemptView } from "@/server/attempts";
import { AnswerInput } from "./AnswerInput";
import { Celebration } from "./Celebration";
import { QuestionImage } from "./QuestionImage";

type Status = "saved" | "saving" | "retrying";

const HINTS = { mcq: "Chọn một phương án", tf: "Mỗi ý chọn Đúng hoặc Sai", match: "Ghép mỗi ý với một chữ cái", short: "Gõ đáp án vào ô" } as const;
const SHORT_DELAY_MS = 700;
const RETRY_MS = 3000;
const DEADLINE_POLL_MS = 20000;

const pad = (value: number) => String(value).padStart(2, "0");
const clock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  return `${hours ? `${hours}:` : ""}${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ExamRunner({ view }: { view: AttemptView }) {
  const router = useRouter();
  const { attempt, paper, questions } = view;
  const [answers, setAnswers] = useState<Record<number, AnswerValue | null>>(view.answers);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("saved");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [celebration, setCelebration] = useState<{ level: CelebrationLevel; score: number; maxScore: number } | null>(null);
  // lệch giữa đồng hồ máy học sinh và máy chủ, đo một lần lúc mở trang
  const [offset] = useState(() => view.now - Date.now());
  const [now, setNow] = useState(view.now);
  const [deadline, setDeadline] = useState(attempt.deadline);
  const flagKey = `lnc:flags:${attempt.id}`;
  const [flags, setFlags] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(flagKey) ?? "[]");
    } catch {
      return [];
    }
  });

  const queue = useRef(new Map<number, AnswerValue | null>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const sending = useRef(false);
  const finished = useRef(false);
  const question = questions[index];
  const parts = partsOf(questions);
  const partOf = new Map(parts.flatMap((part) => part.questions.map((item) => [item.seq, part])));
  const contextImage = question.contextSeq !== null ? view.contexts.find((context) => context.seq === question.contextSeq) : undefined;
  const done = questions.filter((item) => isComplete(item.shape, answers[item.seq])).length;
  const remaining = deadline === null ? null : deadline - now;

  async function flush() {
    if (sending.current) return;
    sending.current = true;
    while (queue.current.size && !finished.current) {
      const [seq, value] = queue.current.entries().next().value!;
      queue.current.delete(seq);
      setStatus("saving");
      const result = await callApi(`/api/attempts/${attempt.id}/answers`, "PUT", { seq, value });
      if (result.ok) continue;
      if (result.status === 409) {
        // hết giờ hoặc bài đã nộp ở nơi khác: tải lại để hiện kết quả
        finished.current = true;
        router.refresh();
        break;
      }
      // rớt mạng hay máy chủ bận thì giữ câu đó lại và thử lại sau, trừ khi đã có giá trị mới hơn
      if (!queue.current.has(seq)) queue.current.set(seq, value);
      setStatus("retrying");
      await wait(RETRY_MS);
    }
    sending.current = false;
    if (!queue.current.size) setStatus("saved");
  }

  function enqueue(seq: number, value: AnswerValue | null) {
    queue.current.set(seq, value);
    void flush();
  }

  function answer(value: AnswerValue | null) {
    const seq = question.seq;
    setAnswers((current) => ({ ...current, [seq]: value }));
    const pending = timers.current.get(seq);
    if (pending) clearTimeout(pending);
    // ô trả lời ngắn đợi gõ xong mới gửi, các loại khác gửi ngay
    if (question.shape.kind === "short") {
      setStatus("saving");
      timers.current.set(
        seq,
        setTimeout(() => {
          timers.current.delete(seq);
          enqueue(seq, value);
        }, SHORT_DELAY_MS),
      );
    } else enqueue(seq, value);
  }

  function toggleFlag() {
    const next = flags.includes(question.seq) ? flags.filter((seq) => seq !== question.seq) : [...flags, question.seq];
    setFlags(next);
    try {
      localStorage.setItem(flagKey, JSON.stringify(next));
    } catch {
      // không lưu được đánh dấu thì vẫn làm bài bình thường
    }
  }

  function go(next: number) {
    if (next < 0 || next >= questions.length) return;
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (finished.current) return;
    setSubmitting(true);
    setSubmitError(undefined);
    // gửi nốt các câu đang chờ trước khi nộp
    for (const [seq, timer] of timers.current) {
      clearTimeout(timer);
      queue.current.set(seq, answers[seq] ?? null);
    }
    timers.current.clear();
    await flush();
    // một câu đang gửi dở hoặc đang chờ gửi lại thì đợi nó xong rồi mới nộp
    for (let tries = 0; (sending.current || queue.current.size) && tries < 24; tries++) await wait(250);
    const result = await callApi<{ score: number | null; maxScore: number }>(`/api/attempts/${attempt.id}/submit`, "POST");
    if (!result.ok) {
      setSubmitting(false);
      setSubmitError(result.message);
      return;
    }
    finished.current = true;
    // lời chúc mừng chỉ hiện ngay lúc nộp, mở lại bài sau này là vào thẳng trang kết quả; thi thử của giáo viên thì không chúc
    const level = attempt.isPractice ? null : celebrationLevel(result.score ?? 0, result.maxScore);
    if (!level) return router.refresh();
    setConfirm(false);
    setCelebration({ level, score: result.score ?? 0, maxScore: result.maxScore });
  }

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // đồng hồ đếm theo giờ máy chủ, hết giờ thì tự nộp; không phụ thuộc lần vẽ lại để thao tác liên tục không làm đồng hồ đứng
  useEffect(() => {
    let stopped = false;
    // giáo viên có thể gia hạn kỳ thi khi học sinh đang làm, nên hỏi lại máy chủ hạn nộp mới nhất
    const sync = async (): Promise<number | null | undefined> => {
      try {
        const response = await fetch(`/api/attempts/${attempt.id}/status`, { cache: "no-store" });
        const latest = (await response.json()) as { ok: boolean; deadline?: number | null; submitted?: boolean };
        if (stopped || !latest.ok) return undefined;
        if (latest.submitted && !finished.current) {
          finished.current = true;
          router.refresh();
        }
        const value = latest.deadline ?? null;
        setDeadline(value);
        return value;
      } catch {
        return undefined;
      }
    };
    const timer = setInterval(() => {
      const serverNow = Date.now() + offset;
      setNow(serverNow);
      if (deadline !== null && serverNow >= deadline && !finished.current && !sending.current) {
        clearInterval(timer);
        // hỏi lại hạn nộp trước khi tự nộp; không hỏi được thì cứ nộp, máy chủ quyết định
        void sync().then((latest) => {
          if (stopped || finished.current) return;
          if (latest === undefined || (latest !== null && latest <= Date.now() + offset)) void submitRef.current();
        });
      }
    }, 1000);
    const poll = setInterval(() => void sync(), DEADLINE_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [offset, deadline, attempt.id, router]);

  // còn câu chưa gửi được thì trình duyệt hỏi lại trước khi đóng tab
  useEffect(() => {
    if (status === "saved") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.closest("dialog") || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "ArrowRight") go(index + 1);
      else if (event.key === "ArrowLeft") go(index - 1);
      else if (question.shape.kind === "mcq" && /^[a-h]$/i.test(event.key) && event.key.toUpperCase().charCodeAt(0) - 65 < question.shape.options) answer(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const missing = questions.length - done;
  const low = remaining !== null && remaining <= 5 * 60 * 1000;
  const part = partOf.get(question.seq)!;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{attempt.isPractice ? `Thi thử: ${attempt.title}` : attempt.title}</p>
            <p role="status" aria-live="polite" className={cx("text-xs", status === "retrying" ? "font-semibold text-danger" : "text-muted")}>
              {status === "saved" ? "Đã lưu bài làm" : status === "saving" ? "Đang lưu" : "Mất kết nối, đang thử lưu lại"}
            </p>
          </div>
          <div
            role="timer"
            aria-label={remaining === null ? "Thời gian đã làm" : "Thời gian còn lại"}
            className={cx("rounded-lg px-3 py-1.5 font-mono text-xl font-bold tabular-nums", low ? "bg-danger text-on-brand" : "bg-surface-alt")}
          >
            {remaining === null ? clock(now - attempt.startedAt) : clock(remaining)}
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setSubmitError(undefined);
              setConfirm(true);
            }}
            disabled={submitting}
          >
            Nộp bài
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl items-start gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article aria-labelledby="question-title" className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-l-8 border-line bg-surface-alt px-4 py-3" style={{ borderLeftColor: `var(--kind-${question.shape.kind})` }}>
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-lg font-bold uppercase tracking-wide" style={{ color: `var(--kind-${question.shape.kind})` }}>
                {partTitle(part.number, question.shape.kind)}
              </p>
              <p className="text-sm text-muted">{HINTS[question.shape.kind]}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">
                {index + 1}/{questions.length}
              </span>
              <button
                type="button"
                aria-label="Đánh dấu xem lại"
                title="Đánh dấu xem lại"
                aria-pressed={flags.includes(question.seq)}
                onClick={toggleFlag}
                className={cx(
                  "inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border",
                  flags.includes(question.seq) ? "border-flag-line bg-flag-soft text-flag-ink" : "border-line bg-surface text-ink hover:bg-bg",
                )}
              >
                <Flag aria-hidden="true" className="size-5" fill={flags.includes(question.seq) ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <div className="p-4">
            {/* ảnh câu hỏi đã có chữ "Câu N", tiêu đề chỉ còn cho trình đọc màn hình */}
            <h1 id="question-title" className="sr-only">
              {questionName(question)}
            </h1>
            {contextImage && (
              <div className="mb-4 rounded-lg border-l-4 border-kind-context bg-surface-alt p-3">
                <p className="mb-2 text-sm font-semibold text-kind-context">Thông tin dùng chung</p>
                <QuestionImage src={imageUrl(paper.id, paper.imageVersion, "c", contextImage.seq)} width={contextImage.imageWidth} height={contextImage.imageHeight} alt="Đoạn dẫn chung" />
              </div>
            )}
            <QuestionImage
              key={question.seq}
              src={imageUrl(paper.id, paper.imageVersion, "q", question.seq)}
              width={question.imageWidth}
              height={question.imageHeight}
              alt={`Nội dung ${questionName(question).toLowerCase()}`}
            />
            <section aria-label="Câu trả lời" className="mt-5 border-t border-dashed border-line pt-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Câu trả lời</h2>
              <AnswerInput key={question.seq} shape={question.shape} value={answers[question.seq] ?? null} onChange={answer} format={paper.format} name={questionName(question)} large onEnter={() => go(index + 1)} />
            </section>
            <div className="mt-6 flex gap-3">
              <Button className="flex-1" onClick={() => go(index - 1)} disabled={index === 0}>
                <ChevronLeft aria-hidden="true" className="size-4" />
                Câu trước
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => go(index + 1)} disabled={index === questions.length - 1}>
                Câu sau
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>
        </article>

        <nav aria-label="Danh sách câu" className="rounded-xl border border-line bg-surface p-4 lg:sticky">
          <p className="mb-2 font-bold">
            Đã làm {done}/{questions.length}
          </p>
          {parts.map((group) => (
            <div key={group.number} className="mb-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{partTitle(group.number, group.kind)}</p>
              <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-6">
                {group.questions.map((item) => {
                  const position = questions.indexOf(item);
                  const complete = isComplete(item.shape, answers[item.seq]);
                  const partial = !complete && isTouched(answers[item.seq]);
                  const flagged = flags.includes(item.seq);
                  const states = [complete ? "đã làm" : partial ? "làm dở" : "chưa làm", flagged && "đánh dấu xem lại"].filter(Boolean).join(", ");
                  return (
                    <li key={item.seq}>
                      <button
                        type="button"
                        onClick={() => go(position)}
                        aria-current={position === index ? "step" : undefined}
                        aria-label={`${questionName(item)}, ${states}`}
                        className={cx(
                          "relative h-9 w-full cursor-pointer rounded-md border text-sm font-semibold",
                          complete ? "border-brand bg-brand text-on-brand" : partial ? "border-brand bg-surface text-brand" : "border-line bg-surface text-ink hover:border-brand",
                          position === index && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                        )}
                      >
                        {item.label ?? item.seq}
                        {flagged && <span aria-hidden="true" className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-surface bg-flag ring-1 ring-flag-line" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <ul className="mt-3 space-y-1 text-xs text-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 rounded-sm border border-brand bg-brand" />
              Đã làm
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 rounded-sm border border-brand bg-surface" />
              Làm dở
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3 rounded-full bg-flag ring-1 ring-flag-line" />
              Đánh dấu xem lại
            </li>
          </ul>
        </nav>
      </div>

      <ConfirmDialog
        open={confirm}
        question={missing ? `Nộp bài khi còn ${missing} câu chưa làm xong?` : "Nộp bài?"}
        confirmLabel="Nộp bài"
        pending={submitting}
        error={submitError}
        onConfirm={submit}
        onClose={() => setConfirm(false)}
      />
      {celebration && <Celebration {...celebration} onClose={() => router.refresh()} />}
    </div>
  );
}
