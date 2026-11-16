import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ui-card rounded-xl border border-line bg-surface p-5", className)} {...rest} />;
}
