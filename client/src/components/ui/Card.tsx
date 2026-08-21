import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  accentBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = false,
  accentBorder = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-2xl bg-surface border border-surface-border p-6 transition-all duration-200',
          glow && 'shadow-glow-brand',
          accentBorder && 'hover:border-brand-500/50',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
