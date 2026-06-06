'use client';

import { cn } from '@/lib/utils';
import type { CompanionStage } from '@/types';
import { COMPANION_THEME_COLORS } from '@/lib/customization/CustomizationItems';

interface CompanionBlobProps {
  stage: CompanionStage;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animationCue?: string;
  className?: string;
  'aria-label'?: string;
  customTheme?: string | null;
  customAccessory?: string | null;
}

function getAccessoryPosition(emoji: string) {
  if (emoji === '🕶️') {
    return { top: '32%', left: '50%', transform: 'translateX(-50%)' };
  }
  if (emoji === '👑') {
    return { top: '-12%', left: '50%', transform: 'translateX(-50%) rotate(-8deg)' };
  }
  if (emoji === '🎩') {
    return { top: '-22%', left: '50%', transform: 'translateX(-50%) rotate(-4deg)' };
  }
  if (emoji === '🎓') {
    return { top: '-18%', left: '48%', transform: 'translateX(-50%) rotate(-6deg)' };
  }
  if (emoji === '🎀') {
    return { top: '10%', right: '10%', transform: 'rotate(15deg)' };
  }
  if (emoji === '🎧') {
    return { top: '25%', left: '50%', transform: 'translateX(-50%) scale(1.15)' };
  }
  return { top: '-5%', left: '50%', transform: 'translateX(-50%)' };
}

const STAGE_COLORS: Record<CompanionStage, { fill: string; glow: string; secondary: string }> = {
  egg:     { fill: '#d2ccc0', glow: '#e5e1d8', secondary: '#b5ada0' },
  sprout:  { fill: '#aec18e', glow: '#cddab8', secondary: '#8fa56a' },
  bloom:   { fill: '#e6884a', glow: '#f5cfaf', secondary: '#d1541d' },
  glow:    { fill: '#8e6dbc', glow: '#ddd4ed', secondary: '#7a56a9' },
  radiant: { fill: '#f5c842', glow: '#fde68a', secondary: '#d97706' },
};

const ANIMATION_CLASSES: Record<string, string> = {
  pulse_dormant:   'companion-egg',
  sway_small:      'companion-sprout',
  breathe:         'companion-bloom',
  glow_pulse:      'companion-glow',
  radiate:         'companion-radiant',
  pulse_gentle:    'companion-egg',
  bloom_brief:     'animate-bloom',
  float_up:        'animate-fade-in',
  oscillate_soft:  'companion-sprout',
  idle:            'companion-egg',
};

const STAGE_ANIMATION: Record<CompanionStage, string> = {
  egg:     'companion-egg',
  sprout:  'companion-sprout',
  bloom:   'companion-bloom',
  glow:    'companion-glow',
  radiant: 'companion-radiant',
};

const SIZES = {
  sm:  48,
  md:  96,
  lg:  144,
  xl:  200,
};

// Blob paths per stage — increasingly complex and expressive
const BLOB_PATHS: Record<CompanionStage, string> = {
  egg:
    'M50,15 C65,15 78,25 82,40 C86,55 80,70 68,78 C56,86 44,86 32,78 C20,70 14,55 18,40 C22,25 35,15 50,15 Z',
  sprout:
    'M50,12 C62,10 76,18 83,32 C90,46 87,64 76,74 C65,84 48,88 34,80 C20,72 13,56 16,40 C19,24 38,14 50,12 Z',
  bloom:
    'M50,10 C64,8 78,18 84,33 C90,48 86,65 73,75 C60,85 44,88 30,80 C16,72 10,55 14,39 C18,23 36,12 50,10 Z',
  glow:
    'M50,8 C66,6 80,18 86,34 C92,50 87,68 73,78 C59,88 42,90 27,81 C12,72 8,54 12,37 C16,20 34,10 50,8 Z',
  radiant:
    'M50,6 C68,4 84,16 89,34 C94,52 88,72 73,82 C58,92 38,93 23,83 C8,73 4,52 9,34 C14,16 32,8 50,6 Z',
};

export function CompanionBlob({
  stage,
  size = 'md',
  animationCue,
  className,
  'aria-label': ariaLabel,
  customTheme,
  customAccessory,
}: CompanionBlobProps) {
  const colors = (customTheme && COMPANION_THEME_COLORS[customTheme])
    ? COMPANION_THEME_COLORS[customTheme]
    : STAGE_COLORS[stage];
  const px = SIZES[size];
  const animClass = animationCue
    ? (ANIMATION_CLASSES[animationCue] ?? STAGE_ANIMATION[stage])
    : STAGE_ANIMATION[stage];

  const glowId = `glow-${stage}-${size}`;
  const gradId = `grad-${stage}-${size}`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={ariaLabel ?? `Companion — ${stage} stage`}
    >
      {/* Outer glow for glow/radiant stages */}
      {(stage === 'glow' || stage === 'radiant') && (
        <div
          className="absolute inset-0 rounded-full opacity-40 blur-xl"
          style={{ backgroundColor: colors.glow, transform: 'scale(1.3)' }}
          aria-hidden="true"
        />
      )}

      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        className={animClass}
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={gradId} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor={colors.glow} />
            <stop offset="60%" stopColor={colors.fill} />
            <stop offset="100%" stopColor={colors.secondary} />
          </radialGradient>
          {(stage === 'glow' || stage === 'radiant') && (
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Main blob */}
        <path
          d={BLOB_PATHS[stage]}
          fill={`url(#${gradId})`}
          filter={stage === 'glow' || stage === 'radiant' ? `url(#${glowId})` : undefined}
        />

        {/* Egg inner highlight */}
        {stage === 'egg' && (
          <ellipse cx="38" cy="35" rx="8" ry="5" fill="white" opacity="0.25" />
        )}

        {/* Sprout: small leaf suggestion */}
        {stage === 'sprout' && (
          <>
            <ellipse cx="35" cy="30" rx="10" ry="6" fill="white" opacity="0.20" />
            <circle cx="62" cy="28" r="3" fill={colors.glow} opacity="0.5" />
          </>
        )}

        {/* Bloom: warmth highlights */}
        {stage === 'bloom' && (
          <>
            <ellipse cx="34" cy="28" rx="12" ry="7" fill="white" opacity="0.22" />
            <circle cx="66" cy="26" r="4" fill={colors.glow} opacity="0.5" />
            <circle cx="70" cy="60" r="3" fill={colors.glow} opacity="0.3" />
          </>
        )}

        {/* Glow: luminous particles */}
        {stage === 'glow' && (
          <>
            <ellipse cx="33" cy="27" rx="13" ry="8" fill="white" opacity="0.25" />
            <circle cx="68" cy="24" r="4" fill="white" opacity="0.4" />
            <circle cx="72" cy="62" r="3" fill="white" opacity="0.3" />
            <circle cx="28" cy="65" r="2.5" fill="white" opacity="0.25" />
          </>
        )}

        {/* Radiant: full luminescence */}
        {stage === 'radiant' && (
          <>
            <ellipse cx="32" cy="26" rx="14" ry="9" fill="white" opacity="0.30" />
            <circle cx="69" cy="22" r="5" fill="white" opacity="0.45" />
            <circle cx="73" cy="63" r="4" fill="white" opacity="0.35" />
            <circle cx="26" cy="66" r="3" fill="white" opacity="0.30" />
            <circle cx="50" cy="80" r="2.5" fill="white" opacity="0.25" />
            <circle cx="20" cy="45" r="2" fill="white" opacity="0.20" />
          </>
        )}
      </svg>

      {/* Accessory Overlay */}
      {customAccessory && (
        <div
          className="absolute pointer-events-none select-none"
          style={{
            fontSize: size === 'xl' ? '2.5rem' : size === 'lg' ? '1.8rem' : size === 'md' ? '1.2rem' : '0.8rem',
            ...getAccessoryPosition(customAccessory)
          }}
        >
          {customAccessory}
        </div>
      )}
    </div>
  );
}
