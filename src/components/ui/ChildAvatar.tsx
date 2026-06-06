'use client';

import React from 'react';

interface ChildAvatarProps {
  baseEmoji?: string;
  accessory?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const AVATAR_SIZES = {
  sm: 'w-10 h-10 text-xl',
  md: 'w-16 h-16 text-3xl',
  lg: 'w-24 h-24 text-5xl',
  xl: 'w-32 h-32 text-7xl'
};

const ACCESSORY_POSITIONS: Record<string, string> = {
  '🕶️': 'top-[35%] left-[50%] -translate-x-[50%] text-[0.6em]',
  '👑': 'top-[-10%] left-[50%] -translate-x-[50%] -rotate-6 text-[0.65em]',
  '🎩': 'top-[-22%] left-[50%] -translate-x-[50%] -rotate-3 text-[0.7em]',
  '🎓': 'top-[-18%] left-[50%] -translate-x-[50%] -rotate-6 text-[0.65em]',
  '🎀': 'top-[12%] right-[8%] rotate-12 text-[0.55em]',
  '🎧': 'top-[26%] left-[50%] -translate-x-[50%] scale-110 text-[0.6em]'
};

export function ChildAvatar({ baseEmoji = '🦊', accessory, size = 'md', className, onClick }: ChildAvatarProps) {
  const sizeClass = AVATAR_SIZES[size];
  const accPos = accessory ? (ACCESSORY_POSITIONS[accessory] || 'top-0 left-[50%] -translate-x-[50%] text-[0.5em]') : '';

  return (
    <div
      onClick={onClick}
      className={`relative rounded-full bg-bloom-50 dark:bg-stone-850 border border-bloom-100 dark:border-stone-750 flex items-center justify-center select-none shadow-soft ${sizeClass} ${className}`}
    >
      <span>{baseEmoji}</span>
      {accessory && (
        <span className={`absolute pointer-events-none ${accPos}`}>
          {accessory}
        </span>
      )}
    </div>
  );
}
