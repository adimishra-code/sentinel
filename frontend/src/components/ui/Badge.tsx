import { clsx } from 'clsx';
import { ReactNode } from 'react';

type BadgeVariant = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'neutral';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  critical: 'bg-status-critical-50 text-status-critical-700 border-status-critical-200',
  high: 'bg-status-high-50 text-status-high-700 border-status-high-200',
  medium: 'bg-status-medium-50 text-status-medium-700 border-status-medium-200',
  low: 'bg-status-low-50 text-status-low-700 border-status-low-200',
  info: 'bg-status-info-50 text-status-info-700 border-status-info-200',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

const dotColors: Record<BadgeVariant, string> = {
  critical: 'bg-status-critical',
  high: 'bg-status-high',
  medium: 'bg-status-medium',
  low: 'bg-status-low',
  info: 'bg-status-info',
  neutral: 'bg-neutral-400',
};

export function Badge({ children, variant = 'neutral', className, dot }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} aria-hidden="true" />}
      {children}
    </span>
  );
}