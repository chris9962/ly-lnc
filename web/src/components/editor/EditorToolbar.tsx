import { FilePlus, ListPlus, RotateCcw, SquareMinus, SquarePlus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type Tool = { label: string; hint: string; icon: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean };

const icon = { "aria-hidden": true, className: "size-5", strokeWidth: 1.8 } as const;

export const TOOL_ICONS = {
  question: <FilePlus {...icon} />,
  context: <ListPlus {...icon} />,
  addBox: <SquarePlus {...icon} />,
  removeBox: <SquareMinus {...icon} />,
  reset: <RotateCcw {...icon} />,
  trash: <Trash2 {...icon} />,
};

function ToolButton({ label, hint, icon, onClick, disabled, danger }: Tool) {
  return (
    <div className="group relative">
      {/* aria-disabled thay cho disabled để nút mờ vẫn nhận tiêu điểm và hiện chú thích */}
      <button
        type="button"
        aria-label={label}
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
        className={cx(
          "flex size-10 items-center justify-center rounded-lg border border-transparent",
          disabled ? "cursor-default opacity-40" : danger ? "cursor-pointer text-danger hover:border-danger hover:bg-danger-soft" : "cursor-pointer text-ink hover:border-line hover:bg-surface-alt",
        )}
      >
        {icon}
      </button>
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute left-full top-1/2 z-40 ml-2 w-max max-w-56 -translate-y-1/2 rounded-md bg-ink px-2.5 py-1.5 text-left text-xs text-surface opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <span className="block font-semibold">{label}</span>
        <span className="block opacity-85">{hint}</span>
      </div>
    </div>
  );
}

export function EditorToolbar({ groups }: { groups: Tool[][] }) {
  return (
    <div role="toolbar" aria-label="Công cụ chỉnh đề" aria-orientation="vertical" className="sticky top-[calc(var(--header-h)+3.5rem)] z-20 flex h-[calc(100vh-var(--header-h)-3.5rem)] w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface py-3">
      {groups.map((tools, index) => (
        <div key={index} className={cx("flex flex-col items-center gap-1", index > 0 && "mt-2 border-t border-line pt-3")}>
          {tools.map((tool) => (
            <ToolButton key={tool.label} {...tool} />
          ))}
        </div>
      ))}
    </div>
  );
}
