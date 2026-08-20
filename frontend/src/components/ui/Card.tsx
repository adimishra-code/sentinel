import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  elevated?: boolean;
}

export function Card({ children, className, hover, elevated }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-neutral-200 rounded-xl',
        hover && 'transition-shadow duration-200 hover:shadow-md',
        elevated && 'shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={clsx('px-5 py-4 border-b border-neutral-200 flex items-center justify-between', className)}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={clsx('p-5', className)}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('px-5 py-4 border-t border-neutral-200 flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}