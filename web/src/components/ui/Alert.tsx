export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mb-4 rounded-lg border border-danger bg-danger-soft px-3 py-2 text-danger">
      {children}
    </p>
  );
}
