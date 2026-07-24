'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CompanionBlob } from './CompanionBlob';
import type { CompanionDisplayState, DialogueLine } from '@/types';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { motion } from 'framer-motion';

interface CompanionWidgetProps {
  display: CompanionDisplayState;
  dialogue?: DialogueLine;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onTap?: () => void;
  worldId?: string | null;
  silentMode?: boolean;
}

export function CompanionWidget({
  display,
  dialogue,
  size = 'lg',
  className,
  onTap,
  worldId,
  silentMode = false,
}: CompanionWidgetProps) {
  const [visibleText, setVisibleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(!silentMode);

  const companionContext = useCompanion();
  const companion = companionContext?.companion;
  const customTheme = companion?.equipped_color_theme || null;
  const customAccessory = companion?.equipped_accessory || null;

  useEffect(() => {
    if (silentMode) return;
    const wakeTimer = setTimeout(() => {
      setIsWakingUp(false);
    }, 1500);
    return () => clearTimeout(wakeTimer);
  }, [silentMode]);

  useEffect(() => {
    if (!dialogue?.text) return;

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
          onClick={() => setShowBubble(false)}
          className={cn(
            'absolute left-1/2 -translate-x-1/2 text-center transition-all duration-300 z-30 cursor-pointer',
            showBubble && visibleText
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          )}
          style={{
            bottom: hasTallAccessory ? 'calc(100% + 12px)' : 'calc(100% + 8px)',
            width: 'max-content',
            maxWidth: '190px',
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="bg-slate-900/95 text-slate-100 rounded-2xl px-3.5 py-2 shadow-xl border border-teal-500/30 backdrop-blur-md">
            <p className="text-xs font-medium leading-snug font-body">
              {visibleText}
            </p>
          </div>
          {/* Bubble tail */}
          <div
            className="mx-auto w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid rgba(15, 23, 42, 0.95)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Companion blob — tappable with Framer Motion waking up effect */}
        <motion.button
          onClick={onTap}
          initial={silentMode ? {} : { scale: 0.5, y: 15, opacity: 0 }}
          animate={
            silentMode
              ? { scale: 1, y: 0, opacity: 1 }
              : isWakingUp
              ? {
                  scale: [0.5, 1.1, 0.95, 1],
                  y: [15, -10, 2, 0],
                  opacity: [0, 1, 1, 1],
                  filter: [
                    'brightness(1.5) blur(4px)',
                    'brightness(1.2) blur(0px)',
                    'brightness(1) blur(0px)',
                    'brightness(1) blur(0px)',
                  ],
                }
              : { scale: 1, y: 0, opacity: 1, filter: 'brightness(1) blur(0px)' }
          }
          transition={{ duration: 1.2, ease: 'easeOut' }}
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
            worldId={worldId}
            silentMode={silentMode}
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
        </motion.button>
      </div>

      {/* Companion name — shown below */}
      <p className="text-sm font-display text-stone-500 tracking-wide mt-1">
        {display.name}
      </p>
    </div>
  );
}
