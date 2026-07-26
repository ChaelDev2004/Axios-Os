export function EmptyState({
  title = "No data yet",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="axion-soft py-8 text-center">
      <div className="text-sm font-medium text-slate-300">{title}</div>
      {description ? (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
