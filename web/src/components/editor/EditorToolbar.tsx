import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";

type Tool = { label: string; hint: string; icon: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean };

const svg = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", className: "size-5", "aria-hidden": true } as const;

export const TOOL_ICONS = {
  question: (
    <svg {...svg}>
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
      <path d="M13 3v4a1 1 0 0 0 1 1h4l-5-5zM18 8v3" />
      <path d="M17.5 14.5v6M14.5 17.5h6" />
    </svg>
  ),
  context: (
    <svg {...svg}>
      <path d="M4 6h16M4 10h16M4 14h8M4 18h6" />
      <path d="M17.5 14.5v6M14.5 17.5h6" />
    </svg>
  ),
  addBox: (
    <svg {...svg}>
      <path d="M11 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" strokeDasharray="3 2.5" />
      <path d="M17.5 14.5v6M14.5 17.5h6" />
    </svg>
  ),
  removeBox: (
    <svg {...svg}>
      <path d="M11 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" strokeDasharray="3 2.5" />
      <path d="M14.5 17.5h6" />
    </svg>
  ),
  trash: (
    <svg {...svg}>
      <path d="M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  ),
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
