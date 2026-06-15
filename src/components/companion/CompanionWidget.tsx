'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CompanionBlob } from './CompanionBlob';
import type { CompanionDisplayState, DialogueLine } from '@/types';
import { useCompanion } from '@/lib/companion/CompanionProvider';

interface CompanionWidgetProps {
  display: CompanionDisplayState;
  dialogue?: DialogueLine;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onTap?: () => void;
}

export function CompanionWidget({
  display,
  dialogue,
  size = 'lg',
  className,
  onTap,
}: CompanionWidgetProps) {
  const [visibleText, setVisibleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);

  let companionContext = null;
  try {
    companionContext = useCompanion();
  } catch (e) {
    // Fail silently if used outside provider
  }
  const companion = companionContext?.companion;
  const customTheme = companion?.equipped_color_theme || null;
  const customAccessory = companion?.equipped_accessory || null;

  useEffect(() => {
    if (!dialogue?.text) return;

    setShowBubble(false);
    setVisibleText('');

    const timer = setTimeout(() => {
      setVisibleText(dialogue.text);
      setShowBubble(true);
    }, 300);

    // Auto-hide after duration
    const hideTimer = setTimeout(() => {
      setShowBubble(false);
    }, (dialogue.durationMs ?? 3000) + 300);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [dialogue]);

  // New stage celebration
  useEffect(() => {
    if (display.isNewStage) {
      // Could trigger a special animation here
    }
  }, [display.isNewStage]);

  const hasTallAccessory = customAccessory && (
    customAccessory.includes('👑') ||
    customAccessory.includes('🎩') ||
    customAccessory.includes('🎓')
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 relative',
        className
      )}
    >
      {/* Wrapper around companion button and absolute bubble */}
      <div className="relative">
        {/* Dialogue bubble */}
        <div
          className={cn(
            'absolute left-1/2 -translate-x-1/2 text-center transition-all duration-300 z-20',
            showBubble && visibleText
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          )}
          style={{
            bottom: hasTallAccessory ? 'calc(100% + 50px)' : 'calc(100% + 6px)',
            width: 'max-content',
            maxWidth: '220px',
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-white rounded-3xl px-4 py-2.5 shadow-card border border-stone-100/80">
            <p className="text-sm text-stone-700 leading-relaxed font-body">
              {visibleText}
            </p>
          </div>
          {/* Bubble tail */}
          <div
            className="mx-auto w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid white',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Companion blob — tappable */}
        <button
          onClick={onTap}
          className={cn(
            'relative focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 rounded-full block',
            onTap && 'cursor-pointer',
            !onTap && 'cursor-default',
            display.isNewStage && 'animate-bloom'
          )}
          aria-label={`${display.name}, companion en etapa ${display.stage}`}
          tabIndex={onTap ? 0 : -1}
        >
          <CompanionBlob
            stage={display.stage}
            size={size}
            animationCue={dialogue?.animationCue}
            customTheme={customTheme}
            customAccessory={customAccessory}
          />

          {/* New stage indicator — subtle glow ring */}
          {display.isNewStage && (
            <div
              className="absolute inset-0 rounded-full animate-ping"
              style={{
                background: 'transparent',
                border: '2px solid currentColor',
                opacity: 0.3,
              }}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      {/* Companion name — shown below */}
      <p className="text-sm font-display text-stone-500 tracking-wide mt-1">
        {display.name}
      </p>
    </div>
  );
}
