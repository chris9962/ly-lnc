import type { ComponentProps } from "react";

type Props = { label: string; indeterminate?: boolean } & Omit<ComponentProps<"input">, "type">;

// ô không có chữ đi kèm, nhãn nằm trong aria-label; thẻ label bọc ngoài mở rộng vùng bấm lên 32px
export function Checkbox({ label, indeterminate, ...rest }: Props) {
  return (
    <label className="inline-flex size-8 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        aria-label={label}
        // indeterminate chỉ đặt được qua thuộc tính DOM, không có attribute HTML
        ref={(element) => {
          if (element) element.indeterminate = !!indeterminate;
        }}
        className="size-4 cursor-pointer accent-brand"
        {...rest}
      />
    </label>
  );
}
