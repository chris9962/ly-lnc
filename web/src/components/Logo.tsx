// khối thương hiệu: màu cố định, không đổi theo giao diện sáng tối
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="block flex-none">
      <rect width="64" height="64" rx="14" fill="#1757c2" />
      <g fill="none" stroke="#fff" strokeWidth="3">
        <ellipse cx="32" cy="32" rx="25" ry="9.5" />
        <ellipse cx="32" cy="32" rx="25" ry="9.5" transform="rotate(60 32 32)" />
        <ellipse cx="32" cy="32" rx="25" ry="9.5" transform="rotate(120 32 32)" />
      </g>
      <circle cx="32" cy="32" r="5.5" fill="#ffd34d" />
      <circle cx="57" cy="32" r="3.2" fill="#fff" />
      <circle cx="19.5" cy="10.3" r="3.2" fill="#fff" />
      <circle cx="19.5" cy="53.7" r="3.2" fill="#fff" />
    </svg>
  );
}
