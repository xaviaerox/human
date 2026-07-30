import React from 'react';

interface MiraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function MiraLogo({ size = 'md', showText = false, className = '' }: MiraLogoProps) {
  const dimensionMap = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const iconClass = dimensionMap[size];
  const textClass = textMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${iconClass}`}>
        <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-md" aria-hidden="true">
          <defs>
            <linearGradient id="miraCompBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
            <linearGradient id="miraCompStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="128" fill="url(#miraCompBgGrad)" />
          <circle cx="256" cy="256" r="160" fill="none" stroke="#fef08a" strokeWidth="8" opacity="0.35" />
          <path
            d="M 256 80 C 256 180 180 256 80 256 C 180 256 256 332 256 432 C 256 332 332 256 432 256 C 332 256 256 180 256 80 Z"
            fill="url(#miraCompStarGrad)"
          />
          <circle cx="256" cy="256" r="28" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <span className={`font-display font-semibold text-stone-800 tracking-tight ${textClass}`}>
          miratea
        </span>
      )}
    </div>
  );
}
