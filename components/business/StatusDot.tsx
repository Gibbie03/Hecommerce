export function StatusDot({ open }: { open: boolean | null }) {
  if (open === null) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-muted">Hours unknown</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${open ? "bg-forest" : "bg-danger"}`} />
      <span className={open ? "text-forest" : "text-danger"}>{open ? "Open now" : "Closed"}</span>
    </span>
  );
}
