type StatBarProps = {
  label: string;
  value: number;
};

function clampValue(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.min(99, Math.round(value)));
}

export default function StatBar({ label, value }: StatBarProps) {
  const normalizedValue = clampValue(value);
  const width = `${normalizedValue}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
        <span>{label}</span>
        <span className="text-sky-300">{normalizedValue}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300"
          style={{ width }}
        />
      </div>
    </div>
  );
}
