import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "border-brand bg-brand font-semibold text-on-brand hover:border-brand-strong hover:bg-brand-strong",
  secondary: "border-line bg-surface text-ink hover:bg-surface-alt",
  danger: "border-danger bg-surface text-danger hover:bg-danger-soft",
};

const SIZES: Record<Size, string> = { md: "min-h-10 px-4 py-2", sm: "min-h-8 px-3 py-1 text-sm" };

// rê chuột thì nút nhấc nhẹ và đổ bóng, bấm thì lún xuống; nút bị khoá đứng yên, máy đặt giảm chuyển động thì chỉ đổi màu
const MOTION =
  "transition duration-150 ease-out not-disabled:hover:-translate-y-0.5 not-disabled:hover:shadow-md not-disabled:active:translate-y-0 not-disabled:active:scale-[0.97] not-disabled:active:shadow-none motion-reduce:transition-colors motion-reduce:not-disabled:hover:translate-y-0 motion-reduce:not-disabled:active:scale-100";

export const buttonClass = (variant: Variant = "secondary", size: Size = "md", extra?: string) =>
  cx(
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border no-underline disabled:cursor-default disabled:opacity-60",
    MOTION,
    VARIANTS[variant],
    SIZES[size],
    extra,
  );

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = "secondary", size = "md", className, type = "button", ...rest }: Props) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}
