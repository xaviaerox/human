import { cn } from '@/lib/utils';

interface SparkBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

export function SparkBadge({ count, size = 'md', className, animated }: SparkBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        'bg-amber-50 text-amber-700 border border-amber-200',
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm',
        size === 'lg' && 'px-4 py-1.5 text-base',
        animated && 'animate-bloom',
        className
      )}
      aria-label={`${count} sparks`}
    >
      <span aria-hidden="true">✦</span>
      <span>{count}</span>
    </span>
  );
}

interface SparkDeltaProps {
  delta: number;
  className?: string;
}

export function SparkDelta({ delta, className }: SparkDeltaProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium text-amber-600 animate-slide-up',
        className
      )}
      aria-live="polite"
    >
      <span aria-hidden="true">✦</span>
      +{delta}
    </span>
  );
}
