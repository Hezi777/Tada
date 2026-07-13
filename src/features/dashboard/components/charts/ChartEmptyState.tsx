export function ChartEmptyState() {
  return (
    <div className="flex h-full min-h-[160px] flex-1 items-center justify-center rounded-[20px] bg-[var(--color-surface-muted)] px-6 text-center">
      <p className="text-sm text-[var(--color-text-secondary)]">
        This chart does not have enough data to render.
      </p>
    </div>
  );
}
