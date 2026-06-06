import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0–100
  className?: string;
  color?: 'bloom' | 'moss' | 'sky' | 'lavender';
  label?: string;
  showPercent?: boolean; // only for parent dashboard
}

export function ProgressBar({
  value,
  className,
  color = 'moss',
  label,
  showPercent = false,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const trackColors = {
    bloom: 'bg-bloom-100',
    moss: 'bg-moss-100',
    sky: 'bg-sky-100',
    lavender: 'bg-lavender-100',
  };

  const fillColors = {
    bloom: 'bg-bloom-400',
    moss: 'bg-moss-400',
    sky: 'bg-sky-400',
    lavender: 'bg-lavender-400',
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-stone-500">{label}</span>}
          {showPercent && (
            <span className="text-xs text-stone-400">{clamped}%</span>
          )}
        </div>
      )}
      <div
        className={cn('w-full rounded-full h-2 overflow-hidden', trackColors[color])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            fillColors[color]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
