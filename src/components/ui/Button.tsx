'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'calm';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center font-body font-medium rounded-2xl',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.97]',

          // Sizes
          size === 'sm' && 'px-4 py-2 text-sm gap-1.5',
          size === 'md' && 'px-6 py-3 text-base gap-2',
          size === 'lg' && 'px-8 py-4 text-lg gap-2.5',
          size === 'xl' && 'px-10 py-5 text-xl gap-3 rounded-3xl',

          // Variants
          variant === 'primary' && 'bg-bloom-500 text-white shadow-soft hover:bg-bloom-600 hover:shadow-card focus-visible:ring-bloom-400 disabled:bg-bloom-300 disabled:text-white/80',
          variant === 'secondary' && 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 hover:border-stone-300 focus-visible:ring-stone-400 disabled:bg-stone-50 disabled:text-stone-400',
          variant === 'ghost' && 'bg-transparent text-stone-600 hover:bg-stone-100 focus-visible:ring-stone-400 disabled:bg-transparent disabled:text-stone-300',
          variant === 'calm' && 'bg-moss-100 text-moss-800 border border-moss-200 hover:bg-moss-200 hover:border-moss-300 focus-visible:ring-moss-400 disabled:bg-moss-50 disabled:text-moss-400',

          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
