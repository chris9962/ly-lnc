import { cx } from "./cx";

type Tone = "neutral" | "success" | "warning" | "danger" | "live" | "soon";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-surface-alt text-muted",
  success: "border-success bg-success-soft text-success",
  warning: "border-warning bg-warning-soft text-warning",
  danger: "border-danger bg-danger-soft text-danger",
  live: "border-live bg-live-soft text-live",
  soon: "border-soon bg-soon-soft text-soon",
};

// trạng thái luôn được viết bằng chữ, màu chỉ là phần phụ
export function StatusTag({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cx("inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
