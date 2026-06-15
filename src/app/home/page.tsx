'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { useProgression } from '@/lib/progression/ProgressionProvider';
import { useSparks } from '@/lib/sparks/SparkProvider';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RoutinesToday } from '@/components/routines/RoutinesToday';
import { ActiveGoalStep } from '@/components/goals/ActiveGoalStep';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { CheckinPromptCard } from '@/components/emotional/CheckinPromptCard';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import { motion, AnimatePresence } from 'framer-motion';
import { SparkCelebrationOverlay } from '@/components/ui/SparkCelebrationOverlay';
import { ChildAvatar } from '@/components/ui/ChildAvatar';
import { CustomizationModal } from '@/components/companion/CustomizationModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSuggestedWords } from '@/lib/emotional/EmotionModel';

import { useRouter } from 'next/navigation';
import type { Reward, RewardRequest, ValueDimensionId, ChildBadge, CompanionMemory, DialogueLine } from '@/types';

const rewardsAdapter = getRewardsAdapter();

interface WorldTheme {
  id: string;
  name: string;
  dimension: ValueDimensionId;
  bgGradient: string;
  textColor: string;
  accentBg: string;
  emoji: string;
  description: string;
}

const WORLD_THEMES: WorldTheme[] = [
  {
    id: 'lago_calma',
    name: 'Lago de la Calma',
    dimension: 'regulation',
    bgGradient: 'from-sky-100 via-sky-50 to-blue-200 dark:from-sky-950 dark:via-sky-900 dark:to-indigo-950',
    textColor: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-100 border-sky-200 dark:bg-sky-900/50 dark:border-sky-850',
    emoji: '💧',
    description: 'Aprende a regular tus emociones y respirar hondo.',
  },
  {
    id: 'valle_habitos',
    name: 'Valle de los Hábitos',
    dimension: 'connection', // Constancia
    bgGradient: 'from-emerald-100 via-green-50 to-teal-200 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950',
    textColor: 'text-moss-700 dark:text-moss-300',
    accentBg: 'bg-moss-100 border-moss-200 dark:bg-moss-900/50 dark:border-moss-850',
    emoji: '🍃',
    description: 'La constancia en tus rutinas hace que este valle florezca.',
  },
  {
    id: 'bosque_autonomia',
    name: 'Bosque de la Autonomía',
    dimension: 'autonomy',
    bgGradient: 'from-green-100 via-emerald-50 to-emerald-300 dark:from-green-950 dark:via-emerald-950 dark:to-emerald-900',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-850',
    emoji: '🌲',
    description: 'Haz las cosas por ti mismo y ayuda a crecer a los árboles.',
  },
  {
    id: 'montana_esfuerzo',
    name: 'Montañas del Esfuerzo',
    dimension: 'courage', // Valentía
    bgGradient: 'from-amber-100 via-orange-50 to-rose-200 dark:from-amber-950 dark:via-orange-950 dark:to-rose-950',
    textColor: 'text-bloom-700 dark:text-bloom-300',
    accentBg: 'bg-bloom-100 border-bloom-200 dark:bg-bloom-900/50 dark:border-bloom-850',
    emoji: '⛰️',
    description: 'Supera tus miedos y sube las cumbres del esfuerzo.',
  },
  {
    id: 'reino_social',
    name: 'Reino de la Vida Social',
    dimension: 'empathy',
    bgGradient: 'from-purple-100 via-pink-50 to-fuchsia-200 dark:from-purple-950 dark:via-pink-950 dark:to-fuchsia-950',
    textColor: 'text-lavender-700 dark:text-lavender-300',
    accentBg: 'bg-lavender-100 border-lavender-200 dark:bg-lavender-900/50 dark:border-lavender-850',
    emoji: '🏰',
    description: 'Comparte con otros, empatiza y haz amigos.',
  },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muy bajo' },
  { value: 2, emoji: '😌', label: 'Bajo' },
  { value: 3, emoji: '🙂', label: 'Normal' },
  { value: 4, emoji: '😊', label: 'Alto' },
  { value: 5, emoji: '⚡', label: 'Muy alto' },
];

const VALENCE_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Muy bien' },
];

function getCooldownStatus(reward: Reward, lastRedeemStr?: string): { isLocked: boolean; text?: string } {
  if (!reward.cooldown_hours || !lastRedeemStr) {
    return { isLocked: false };
  }

  const lastRedeem = new Date(lastRedeemStr);
  const cooldownMs = reward.cooldown_hours * 60 * 60 * 1000;
  const elapsedMs = Date.now() - lastRedeem.getTime();
  const remainingMs = cooldownMs - elapsedMs;

  if (remainingMs <= 0) {
    return { isLocked: false };
  }

  const remainingMinutesTotal = Math.ceil(remainingMs / (1000 * 60));
  const days = Math.floor(remainingMinutesTotal / (24 * 60));
  const hours = Math.floor((remainingMinutesTotal % (24 * 60)) / 60);
  const mins = remainingMinutesTotal % 60;

  let text = '';
  if (days > 0) {
    text = `Espera ${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `Espera ${hours}h`;
  } else {
    text = `Espera ${mins}m`;
  }

  return { isLocked: true, text };
}

function getWorldPhase(score: number): { phase: 'seed' | 'sprout' | 'bloom'; label: string; icon: string } {
  if (score >= 100) return { phase: 'bloom', label: 'Esplendor', icon: '🌸' };
  if (score >= 31) return { phase: 'sprout', label: 'Brote', icon: '🌱' };
  return { phase: 'seed', label: 'Semilla', icon: '🌰' };
}

interface WorldAmbientVisualsProps {
  worldId: string;
  phase: 'seed' | 'sprout' | 'bloom';
}

function WorldAmbientVisuals({ worldId, phase }: WorldAmbientVisualsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none flex flex-col justify-end">
      
      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. LAGO DE LA CALMA (Water & Ripple vibe) */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'lago_calma' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Phase backgrounds */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-slate-200 opacity-90" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-sky-100 to-sky-250 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-300 to-blue-500" />
          )}

          {/* Landscape SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Water body */}
            <path d="M 0 65 Q 25 60 50 64 T 100 60 L 100 100 L 0 100 Z" fill="#0284c7" opacity={phase === 'bloom' ? 0.85 : 0.4} />
            <path d="M 0 75 Q 35 70 70 73 T 100 70 L 100 100 L 0 100 Z" fill="#0369a1" opacity={phase === 'bloom' ? 0.9 : 0.6} />

            {/* Bloom: Lotus Flower and Lily Pads */}
            {phase === 'bloom' && (
              <>
                {/* Lily Pads */}
                <ellipse cx="20" cy="72" rx="10" ry="3" fill="#0d9488" opacity="0.8" />
                <ellipse cx="80" cy="78" rx="12" ry="4" fill="#0d9488" opacity="0.8" />
                <ellipse cx="50" cy="85" rx="18" ry="5" fill="#0f766e" />

                {/* Glowing Lotus center-bottom */}
                <g transform="translate(50, 77) scale(0.45)">
                  {/* Leaves */}
                  <path d="M-30,10 C-40,-5 -15,-10 0,5 C-15,-10 15,-10 30,10 Z" fill="#0f766e" />
                  {/* Outer Petals */}
                  <path d="M0,-25 C-25,-15 -20,10 0,20 C20,10 25,-15 0,-25 Z" fill="#f43f5e" />
                  <path d="M-15,-15 C-35,0 -20,15 0,20 C-20,15 -35,0 -15,-15 Z" fill="#fda4af" />
                  <path d="M15,-15 C35,0 20,15 0,20 C20,15 35,0 15,-15 Z" fill="#fda4af" />
                  {/* Inner petals */}
                  <path d="M0,-15 C-12,-5 -8,10 0,15 C8,10 12,-5 0,-15 Z" fill="#fff1f2" />
                  <circle cx="0" cy="2" r="4" fill="#f59e0b" />
                </g>
              </>
            )}
          </svg>

          {/* Phase-specific items */}
          {phase === 'seed' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-2xl animate-pulse">💧</div>
          )}
          {phase === 'sprout' && (
            <>
              <div className="absolute bottom-8 left-12 text-xl animate-bounce">💧</div>
              <div className="absolute bottom-12 right-16 text-lg animate-pulse">🌱</div>
            </>
          )}
          {phase === 'bloom' && (
            <>
              {/* Float bubbles */}
              <div className="absolute w-2 h-2 rounded-full bg-white/70 bottom-16 left-10 animate-ambient-float-up" />
              <div className="absolute w-3 h-3 rounded-full bg-white/50 bottom-24 right-12 animate-ambient-float-up delay-1000" />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white/80 bottom-8 right-28 animate-ambient-float-up delay-500" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-200/60 bottom-14 right-20 animate-ambient-float-up delay-1500" />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. VALLE DE LOS HÁBITOS (Green hills & Falling leaves) */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'valle_habitos' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Phase backgrounds */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-slate-200 opacity-90" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-green-150 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-200 via-green-100 to-teal-300" />
          )}

          {/* Landscape SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Hills */}
            <path d="M 0 65 Q 25 50 50 60 T 100 55 L 100 100 L 0 100 Z" fill="#4ade80" opacity={phase === 'bloom' ? 0.7 : 0.3} />
            <path d="M 0 75 Q 35 65 70 75 T 100 70 L 100 100 L 0 100 Z" fill="#22c55e" opacity={phase === 'bloom' ? 0.85 : 0.5} />
            <path d="M 0 85 Q 25 80 50 88 T 100 82 L 100 100 L 0 100 Z" fill="#15803d" opacity={phase === 'bloom' ? 0.95 : 0.7} />

            {/* Bloom: Rainbow & Flowers */}
            {phase === 'bloom' && (
              <>
                {/* Rainbow */}
                <path d="M -10 60 Q 50 -10 110 60" fill="none" stroke="#fca5a5" strokeWidth="6" opacity="0.3" />
                <path d="M -10 60 Q 50 -10 110 60" fill="none" stroke="#fef08a" strokeWidth="4" opacity="0.3" />
                <path d="M -10 60 Q 50 -10 110 60" fill="none" stroke="#93c5fd" strokeWidth="2" opacity="0.3" />

                {/* Flowers on hills */}
                <circle cx="15" cy="78" r="1.5" fill="#f43f5e" />
                <circle cx="13" cy="79" r="1.2" fill="#fca5a5" />
                <circle cx="17" cy="79" r="1.2" fill="#fca5a5" />
                
                <circle cx="85" cy="85" r="2" fill="#eab308" />
                <circle cx="82" cy="87" r="1.5" fill="#fef08a" />
                <circle cx="88" cy="87" r="1.5" fill="#fef08a" />

                <circle cx="48" cy="92" r="2.5" fill="#a855f7" />
                <circle cx="45" cy="94" r="1.8" fill="#e9d5ff" />
                <circle cx="51" cy="94" r="1.8" fill="#e9d5ff" />
              </>
            )}
          </svg>

          {/* Phase-specific items */}
          {phase === 'seed' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🌰</div>
          )}
          {phase === 'sprout' && (
            <>
              <div className="absolute bottom-6 left-12 text-xl animate-pulse">🌱</div>
              <div className="absolute bottom-8 right-16 text-lg animate-pulse">🌱</div>
            </>
          )}
          {phase === 'bloom' && (
            <>
              {/* Falling leaves & petals */}
              <div className="absolute top-2 left-6 text-sm animate-ambient-float-down">🍃</div>
              <div className="absolute top-8 right-8 text-xs animate-ambient-float-down delay-1000">🍃</div>
              <div className="absolute top-16 left-24 text-sm animate-ambient-float-down delay-500">🌸</div>
              <div className="absolute top-4 right-24 text-xs animate-ambient-float-down delay-1500">🌸</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. BOSQUE DE LA AUTONOMÍA (Trees & Glowing Fireflies) */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'bosque_autonomia' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Phase backgrounds */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-slate-200 opacity-90" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 to-emerald-150 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-900 to-emerald-900" />
          )}

          {/* Landscape SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Moon in bloom */}
            {phase === 'bloom' && (
              <circle cx="80" cy="22" r="8" fill="#fef08a" filter="blur(1px)" opacity="0.85" />
            )}

            {/* Forest landscape */}
            <path d="M 0 60 Q 20 45 45 58 T 100 50 L 100 100 L 0 100 Z" fill="#047857" opacity={phase === 'bloom' ? 0.6 : 0.3} />
            <path d="M 0 70 Q 30 60 60 72 T 100 65 L 100 100 L 0 100 Z" fill="#065f46" opacity={phase === 'bloom' ? 0.8 : 0.5} />
            <path d="M 0 82 Q 25 78 50 85 T 100 80 L 100 100 L 0 100 Z" fill="#064e3b" opacity={phase === 'bloom' ? 0.95 : 0.7} />

            {/* Pine silhouettes in bloom */}
            {phase === 'bloom' && (
              <>
                <polygon points="12,65 7,78 17,78" fill="#022c22" />
                <polygon points="12,58 9,68 15,68" fill="#022c22" />
                
                <polygon points="85,72 80,85 90,85" fill="#022c22" />
                <polygon points="85,65 82,75 88,75" fill="#022c22" />
              </>
            )}
          </svg>

          {/* Phase-specific items */}
          {phase === 'seed' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🌱</div>
          )}
          {phase === 'sprout' && (
            <>
              <div className="absolute bottom-6 left-10 text-xl">🌲</div>
              <div className="absolute bottom-8 right-12 text-lg">🌲</div>
            </>
          )}
          {phase === 'bloom' && (
            <>
              {/* Glowing fireflies */}
              <div className="absolute w-2 h-2 bg-yellow-300 rounded-full blur-[2px] bottom-16 left-12 animate-firefly" />
              <div className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full blur-[1px] bottom-24 right-16 animate-firefly delay-500" />
              <div className="absolute w-2 h-2 bg-yellow-300 rounded-full blur-[2px] bottom-32 left-32 animate-firefly delay-1000" />
              <div className="absolute w-1.5 h-1.5 bg-green-200 rounded-full blur-[1px] bottom-10 right-28 animate-firefly delay-1500" />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. MONTAÑAS DEL ESFUERZO (Mountains & Twinkling Stars) */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'montana_esfuerzo' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Phase backgrounds */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-slate-200 opacity-90" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-100 to-slate-250 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-900" />
          )}

          {/* Landscape SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Mountains */}
            <path d="M 0 100 L 30 45 L 60 85 L 80 52 L 100 90 L 100 100 Z" fill="#475569" opacity={phase === 'bloom' ? 0.6 : 0.3} />
            <path d="M 0 100 L 20 62 L 45 48 L 75 78 L 100 62 L 100 100 Z" fill="#334155" opacity={phase === 'bloom' ? 0.85 : 0.6} />

            {/* Snow Caps in bloom */}
            {phase === 'bloom' && (
              <>
                <polygon points="30,45 25,54 35,54" fill="#f1f5f9" />
                <polygon points="45,48 40,56 50,56" fill="#f1f5f9" />
                <polygon points="80,52 76,59 84,59" fill="#f1f5f9" />

                {/* Flag on highest peak */}
                <line x1="30" y1="45" x2="30" y2="38" stroke="#ef4444" strokeWidth="1" />
                <polygon points="30,38 30,41 35,39.5" fill="#ef4444" />
              </>
            )}
          </svg>

          {/* Phase-specific items */}
          {phase === 'seed' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl animate-bounce">⛰️</div>
          )}
          {phase === 'sprout' && (
            <>
              <div className="absolute bottom-16 left-16 text-2xl opacity-75 animate-pulse">⛰️</div>
              <div className="absolute bottom-20 right-20 text-xl opacity-75 animate-pulse">⛰️</div>
            </>
          )}
          {phase === 'bloom' && (
            <>
              {/* Twinkling stars */}
              <div className="absolute top-4 left-10 text-lg animate-pulse text-yellow-300">⭐</div>
              <div className="absolute top-8 right-16 text-sm animate-pulse delay-500 text-yellow-250">⭐</div>
              <div className="absolute top-16 left-28 text-xs animate-pulse delay-1000 text-white">⭐</div>
              <div className="absolute top-10 right-32 text-md animate-pulse delay-200 text-yellow-300">✨</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. REINO DE LA VIDA SOCIAL (Castle & Floating Hearts) */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'reino_social' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Phase backgrounds */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-slate-200 opacity-90" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-purple-150 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-pink-300 via-purple-200 to-fuchsia-400" />
          )}

          {/* Landscape SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Hills */}
            <path d="M 0 68 Q 15 50 40 65 T 100 55 L 100 100 L 0 100 Z" fill="#c084fc" opacity={phase === 'bloom' ? 0.65 : 0.3} />
            <path d="M 0 78 Q 25 65 50 78 T 100 70 L 100 100 L 0 100 Z" fill="#a855f7" opacity={phase === 'bloom' ? 0.85 : 0.6} />

            {/* Castle in bloom */}
            {phase === 'bloom' && (
              <g transform="translate(50, 68) scale(0.6)">
                {/* Keep castle centered background */}
                {/* Towers */}
                <rect x="-30" y="-40" width="12" height="40" fill="#701a75" />
                <polygon points="-30,-40 -24,-52 -18,-40" fill="#be185d" />
                
                <rect x="18" y="-40" width="12" height="40" fill="#701a75" />
                <polygon points="18,-40 24,-52 30,-40" fill="#be185d" />

                {/* Central structure */}
                <rect x="-20" y="-30" width="40" height="30" fill="#86198f" />
                <rect x="-8" y="-42" width="16" height="15" fill="#701a75" />
                <polygon points="-8,-42 0,-54 8,-42" fill="#be185d" />

                {/* Door & Windows */}
                <rect x="-6" y="-14" width="12" height="14" rx="4" fill="#581c87" />
                <rect x="-4" y="-32" width="8" height="8" rx="2" fill="#fef08a" />
              </g>
            )}
          </svg>

          {/* Phase-specific items */}
          {phase === 'seed' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-2xl animate-bounce">🧱</div>
          )}
          {phase === 'sprout' && (
            <>
              <div className="absolute bottom-8 left-12 text-2xl">🏰</div>
              <div className="absolute bottom-8 right-16 text-xl">🏰</div>
            </>
          )}
          {phase === 'bloom' && (
            <>
              {/* Floating Hearts */}
              <div className="absolute bottom-16 left-[25%] text-lg animate-ambient-float-up text-red-400 opacity-90">❤️</div>
              <div className="absolute bottom-20 right-[25%] text-2xl animate-ambient-float-up delay-[1.5s] text-pink-400 opacity-90">💖</div>
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-xl animate-ambient-float-up delay-[3s] text-rose-400 opacity-80">💝</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();
  const profile = session?.profile ?? null;
  
  const { display, getDialogue, setAppearanceContext, isVisible, memories, interact } = useCompanion();
  const { scores, badges } = useProgression();
  const { balance: sparkBalance } = useSparks();
  const { shouldPrompt, submitCheckin, recentCheckins, lastCheckin } = useEmotional();

  const [dialogue, setDialogue] = useState(() =>
    display ? getDialogue('greeting') : undefined
  );
  
  // Navigation tabs: 'hogar' | 'routines' | 'goals' | 'checkin'
  const [activeTab, setActiveTab] = useState<'hogar' | 'routines' | 'goals' | 'checkin'>('hogar');
  const [selectedWorld, setSelectedWorld] = useState<WorldTheme>(WORLD_THEMES[0]!);
  
  const [showRewards, setShowRewards] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);
  const [showWorldsModal, setShowWorldsModal] = useState(false);

  // Check-in State
  const [checkinStep, setCheckinStep] = useState<'energy' | 'valence' | 'word' | 'note' | 'done'>('energy');
  const [checkinEnergy, setCheckinEnergy] = useState<number | null>(null);
  const [checkinValence, setCheckinValence] = useState<number | null>(null);
  const [checkinWord, setCheckinWord] = useState('');
  const [checkinCustomWord, setCheckinCustomWord] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinDialogue, setCheckinDialogue] = useState<DialogueLine | undefined>(undefined);

  const checkinSuggestedWords = useMemo(() => {
    return checkinEnergy !== null && checkinValence !== null
      ? getSuggestedWords({
          energy_level: checkinEnergy as any,
          valence: checkinValence as any,
        })
      : [];
  }, [checkinEnergy, checkinValence]);

  const lastCheckinTime = lastCheckin ? new Date(lastCheckin.occurred_at).getTime() : 0;
  const isCooldown = Date.now() - lastCheckinTime < 8 * 60 * 60 * 1000;

  // Handle Tab Change to Check-in
  useEffect(() => {
    if (activeTab === 'checkin') {
      setCheckinStep('energy');
      setCheckinEnergy(null);
      setCheckinValence(null);
      setCheckinWord('');
      setCheckinCustomWord('');
      setCheckinNote('');
      if (display) {
        setCheckinDialogue(getDialogue('checkin_prompt' as any));
      }
    }
  }, [activeTab, display, getDialogue]);

  async function handleCheckinSubmit() {
    if (checkinEnergy === null || checkinValence === null || !profile?.id) return;

    const emotion = {
      energy_level: checkinEnergy,
      valence: checkinValence,
      emotion_word: checkinWord || checkinCustomWord || undefined,
    };

    await submitCheckin(emotion as any, 'free', undefined, checkinNote || undefined, 'child');
    await interact('emotional_checkin', { energy: checkinEnergy, valence: checkinValence, word: emotion.emotion_word });

    if (display) {
      setCheckinDialogue(getDialogue('checkin_response', emotion as any));
    }

    setCheckinStep('done');
  }

  const [currentCelebration, setCurrentCelebration] = useState<{ id: string; delta: number; note: string } | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [lastRedemptions, setLastRedemptions] = useState<Record<string, string>>({});
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);

  // State for proposing a new reward
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestEmoji, setRequestEmoji] = useState('🎁');
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Fetch rewards and requests dynamically
  useEffect(() => {
    if (authLoading || !session?.family?.id) return;

    rewardsAdapter.getRewards(session.family.id).then(res => {
      if (res.ok) setRewards(res.data);
    });

    rewardsAdapter.getRewardRequests(session.family.id).then(res => {
      if (res.ok && profile?.id) {
        const pending = res.data.filter(r => r.status === 'pending' && r.child_id === profile.id);
        setRewardRequests(pending);
      }
    });
  }, [session?.family?.id, authLoading, showRewards, profile?.id]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    setAppearanceContext(activeTab === 'hogar' ? 'home' : 'transition');
  }, [activeTab, setAppearanceContext]);

  const showCheckinPrompt = shouldPrompt('morning');
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' :
    hour < 18 ? 'Buenas tardes' :
    'Buenas noches';

  async function handleRedeem(rewardId: string, rewardTitle: string, cost: number) {
    if (sparkBalance < cost || !profile?.id) return;
    setRedeemingId(rewardId);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId);

    const res = await rewardsAdapter.createRewardRequest(session?.family?.id || '', profile.id, {
      title: rewardTitle,
      emoji: '🎁' // can use emoji from rewards catalog
    });

    setRedeemingId(null);
    if (res.ok) {
      alert(`¡Propuesta enviada con éxito! Dile a papá/mamá que apruebe: "${rewardTitle}"`);
      setShowRewards(false);
    } else {
      alert(`Error al proponer: ${res.error.message}`);
    }
  }

  // Find world parameters for the selected home world theme
  const activeWorldScore = useMemo(() => {
    const dim = selectedWorld.dimension;
    return scores[dim] ?? 0;
  }, [selectedWorld, scores]);

  const activeWorldPhase = useMemo(() => {
    return getWorldPhase(activeWorldScore);
  }, [activeWorldScore]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (!session) return null;

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${selectedWorld.bgGradient} transition-all duration-700 flex flex-col relative overflow-x-hidden pb-20`}>

      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <ChildAvatar
            baseEmoji={profile?.avatar_base_emoji}
            accessory={profile?.avatar_accessory}
            size="md"
            className="shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
            onClick={() => setShowCustomization(true)}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest font-body leading-none">
                {greeting}
              </p>
              <button
                onClick={async () => {
                  if (confirm('¿Quieres cerrar sesión?')) {
                    await signOut();
                    router.replace('/login');
                  }
                }}
                className="text-[10px] text-stone-400 hover:text-stone-600 bg-stone-100/80 hover:bg-stone-200/60 px-2 py-0.5 rounded-full transition-all cursor-pointer font-medium leading-none"
              >
                Salir
              </button>
            </div>
            <h1 className="font-display text-2xl text-stone-800 mt-1 flex items-center gap-1.5 leading-none">
              {profile?.display_name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomization(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/95 border border-stone-100 hover:bg-white transition-colors shadow-soft cursor-pointer flex items-center gap-1"
          >
            🎨 Armario
          </button>
          <button
            onClick={() => setShowRewards(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/95 border border-stone-100 hover:bg-white transition-colors shadow-soft cursor-pointer flex items-center gap-1"
          >
            🎁 Canjear
          </button>
          <SparkBadge count={sparkBalance} size="md" />
        </div>
      </header>

      {/* Main View Port */}
      <main className="flex-1 px-4 max-w-lg mx-auto w-full flex flex-col z-10 justify-center">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOGAR / SAFE SPACE */}
          {activeTab === 'hogar' && (
            <motion.div
              key="hogar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-between flex-1 py-4"
            >
              {/* Checkin prompt if morning */}
              {showCheckinPrompt && (
                <div className="w-full mb-4">
                  <CheckinPromptCard
                    onComplete={() => {
                      if (display) setDialogue(getDialogue('checkin_response'));
                    }}
                  />
                </div>
              )}

              {/* World indicator (button to change world) */}
              <button
                onClick={() => setShowWorldsModal(true)}
                className={`px-4 py-2 rounded-full border text-xs font-semibold shadow-soft ${selectedWorld.accentBg} ${selectedWorld.textColor} flex items-center gap-2 mb-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer`}
              >
                <span>{selectedWorld.emoji}</span>
                <span>Mundo: {selectedWorld.name} ({activeWorldPhase.label} {activeWorldPhase.icon}) ▾</span>
              </button>

              {/* Ambient visual state description */}
              <p className="text-stone-400 text-center text-xs italic font-body max-w-xs mb-4">
                {activeWorldPhase.phase === 'seed' && 'El entorno se encuentra en calma, cuidando de una semilla.'}
                {activeWorldPhase.phase === 'sprout' && 'Pequeños brotes de naturaleza comienzan a asomar en los rincones.'}
                {activeWorldPhase.phase === 'bloom' && '¡El entorno irradia flores y una luz vibrante debido a tu crecimiento!'}
              </p>

              {/* Viewport container representing the magical terrarium/world */}
              <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center my-6 overflow-hidden rounded-[40px] border border-stone-250/20 bg-white/45 dark:bg-stone-900/10 backdrop-blur-md shadow-card transition-all duration-700">
                {/* World Ambient Visuals (Background) */}
                <WorldAmbientVisuals worldId={selectedWorld.id} phase={activeWorldPhase.phase} />

                {/* Companion blob widget (Foreground) */}
                {isVisible && display && (
                  <div className="z-10 scale-[1.08]">
                    <CompanionWidget
                      display={display}
                      dialogue={dialogue}
                      size="xl"
                      onTap={() => setDialogue(getDialogue('free_interaction' as any))}
                    />
                  </div>
                )}
              </div>

              {/* Memory Scroll Button */}
              <button
                onClick={() => setShowMemoriesModal(true)}
                className="mt-6 text-xs font-semibold px-4 py-2.5 rounded-full bg-white/80 border border-stone-200 hover:bg-white text-stone-600 transition-colors shadow-soft flex items-center gap-1.5 cursor-pointer"
              >
                📖 Libro de Recuerdos e Insignias
              </button>
            </motion.div>
          )}

          {/* TAB 2: RUTINAS */}
          {activeTab === 'routines' && (
            <motion.div
              key="routines"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">Mis Rutinas</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Pasos diarios para cultivar hábitos positivos
                </p>
              </div>

              {/* Today's routines */}
              <RoutinesToday
                onComplete={() => {
                  if (display) setDialogue(getDialogue('routine_complete'));
                }}
              />
            </motion.div>
          )}

          {/* TAB 3: OBJETIVO (AVENTURAS) */}
          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">Aventuras</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Pasos significativos acompañados de tu compañero
                </p>
              </div>

              {/* Active adventure step */}
              <ActiveGoalStep
                onComplete={() => {
                  if (display) setDialogue(getDialogue('goal_step_complete'));
                }}
              />
            </motion.div>
          )}

          {/* TAB 4: CÓMO ESTOY (CHECK-IN) */}
          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">¿Cómo estoy?</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Reflexiona sobre tus sentimientos y compártelo con tu compañero
                </p>
              </div>

              {/* Cooldown Warning */}
              {checkinStep !== 'done' && isCooldown && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed animate-fade-in shadow-soft">
                  <span className="text-sm">✨</span>
                  <p>
                    Puedes registrar cómo te sientes en cualquier momento, pero solo ganarás estrellas y afecto con tu compañero una vez cada 8 horas.
                  </p>
                </div>
              )}

              {/* Progress bar */}
              {checkinStep !== 'done' && (
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-lavender-400 rounded-full transition-all duration-500"
                    style={{ width: `${(['energy', 'valence', 'word', 'note', 'done'].indexOf(checkinStep) / 4) * 100}%` }}
                  />
                </div>
              )}

              {/* Companion Widget (inside check-in) */}
              {display && checkinStep !== 'done' && (
                <div className="flex justify-center my-4 animate-fade-in">
                  <CompanionWidget
                    display={display}
                    dialogue={checkinStep === 'energy' ? checkinDialogue : undefined}
                    size="md"
                  />
                </div>
              )}

              {/* Step 1: Energy */}
              {checkinStep === 'energy' && (
                <div className="flex flex-col gap-4 animate-slide-up">
                  <p className="font-display text-lg text-stone-700 text-center">
                    ¿Cuánta energía tienes ahora?
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ENERGY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setCheckinEnergy(opt.value);
                          setCheckinStep('valence');
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 py-4 rounded-2xl border cursor-pointer',
                          'bg-white border-stone-200 transition-all duration-200',
                          'hover:border-lavender-300 hover:bg-lavender-50',
                          'active:scale-95'
                        )}
                        aria-label={opt.label}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-[9px] text-stone-400 font-body text-center">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Valence */}
              {checkinStep === 'valence' && (
                <div className="flex flex-col gap-4 animate-slide-up">
                  <p className="font-display text-lg text-stone-700 text-center">
                    ¿Cómo te sientes por dentro?
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {VALENCE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setCheckinValence(opt.value);
                          setCheckinStep('word');
                          if (display) setCheckinDialogue(getDialogue('checkin_prompt' as any));
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1 py-4 rounded-2xl border cursor-pointer',
                          'bg-white border-stone-200 transition-all duration-200',
                          'hover:border-lavender-300 hover:bg-lavender-50',
                          'active:scale-95'
                        )}
                        aria-label={opt.label}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-[9px] text-stone-400 font-body text-center">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Word */}
              {checkinStep === 'word' && (
                <div className="flex flex-col gap-4 animate-slide-up">
                  <p className="font-display text-lg text-stone-700 text-center">
                    ¿Hay una palabra que lo describa?
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center max-h-[140px] overflow-y-auto py-1">
                    {checkinSuggestedWords.map(w => (
                      <button
                        key={w}
                        onClick={() => {
                          setCheckinWord(w);
                          setCheckinStep('note');
                        }}
                        className={cn(
                          'px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer',
                          'bg-white border-stone-200 text-stone-700',
                          'hover:bg-lavender-50 hover:border-lavender-300 hover:text-lavender-700'
                        )}
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      value={checkinCustomWord}
                      onChange={e => setCheckinCustomWord(e.target.value)}
                      placeholder="O escribe tu propia palabra..."
                      className="flex-1 px-4 py-2 rounded-2xl border border-stone-200 text-xs text-stone-750 bg-white focus:outline-none focus:ring-2 focus:ring-lavender-200"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && checkinCustomWord.trim()) {
                          setCheckinWord(checkinCustomWord.trim());
                          setCheckinStep('note');
                        }
                      }}
                    />
                    {checkinCustomWord.trim() && (
                      <Button variant="secondary" size="sm" onClick={() => {
                        setCheckinWord(checkinCustomWord.trim());
                        setCheckinStep('note');
                      }}>
                        OK
                      </Button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCheckinWord('');
                      setCheckinStep('note');
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600 text-center cursor-pointer mt-1"
                  >
                    Saltar esta pregunta
                  </button>
                </div>
              )}

              {/* Step 4: Note */}
              {checkinStep === 'note' && (
                <div className="flex flex-col gap-4 animate-slide-up">
                  <p className="font-display text-lg text-stone-700 text-center">
                    ¿Quieres contar algo más?
                  </p>
                  <textarea
                    value={checkinNote}
                    onChange={e => setCheckinNote(e.target.value)}
                    placeholder="Lo que quieras... o nada, también está bien."
                    rows={3}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-white',
                      'text-stone-700 text-xs leading-relaxed resize-none',
                      'focus:outline-none focus:ring-2 focus:ring-lavender-200',
                      'placeholder:text-stone-300'
                    )}
                  />
                  <Button size="lg" onClick={handleCheckinSubmit} className="w-full">
                    Listo
                  </Button>
                  <button
                    onClick={handleCheckinSubmit}
                    className="text-xs text-stone-400 hover:text-stone-600 text-center cursor-pointer"
                  >
                    Sin nota, guardar así
                  </button>
                </div>
              )}

              {/* Step 5: Done */}
              {checkinStep === 'done' && (
                <div className="flex flex-col items-center gap-4 animate-bloom text-center py-4">
                  {display && (
                    <CompanionWidget
                      display={display}
                      dialogue={checkinDialogue}
                      size="lg"
                    />
                  )}
                  <div className="flex flex-col gap-1.5">
                    <p className="font-display text-xl text-stone-800">
                      Gracias por contármelo
                    </p>
                    <p className="text-stone-500 text-xs font-body max-w-xs mx-auto leading-relaxed">
                      Conocerte mejor me ayuda a estar más cerca de ti y acompañarte en tu día.
                    </p>
                  </div>

                  <Button variant="secondary" size="md" className="mt-2" onClick={() => setActiveTab('hogar')}>
                    Volver a Inicio
                  </Button>

                  {/* Recent check-ins */}
                  {recentCheckins.length > 1 && (
                    <div className="flex gap-1.5 flex-wrap justify-center mt-3 max-w-xs">
                      {recentCheckins.slice(1, 4).map(c => (
                        <span
                          key={c.id}
                          className="px-2.5 py-0.5 bg-stone-50 rounded-full text-[10px] text-stone-500 border border-stone-150 font-body"
                        >
                          {c.emotion_word ?? `${c.valence}/5`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-4 py-2 z-30"
        aria-label="Navegación"
      >
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { tab: 'hogar', label: 'Inicio', icon: '⌂' },
            { tab: 'routines', label: 'Rutinas', icon: '◎' },
            { tab: 'goals', label: 'Objetivo', icon: '◈' },
            { tab: 'checkin', label: 'Cómo estoy', icon: '♡' }
          ].map(item => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab as any)}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all cursor-pointer
                  ${isActive
                    ? 'text-bloom-600 bg-bloom-50'
                    : 'text-stone-400 hover:text-stone-600'
                  }
                `}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>


      {/* MEMORY & BADGES MODAL */}
      <AnimatePresence>
        {showMemoriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemoriesModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-md w-full flex flex-col gap-4 max-h-[85dvh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                  <span>📖</span> Libro de Recuerdos
                </h3>
                <button
                  onClick={() => setShowMemoriesModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Inner Tabs: 'recuerdos' | 'insignias' */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
                  
                  {/* Badges Gallery Section */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Insignias de Valores ({badges.length})
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      {badges.map(badge => {
                        const dim = WORLD_THEMES.find(w => w.dimension === badge.dimension_id);
                        const tierColor =
                          badge.badge_tier === 'gold' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                          badge.badge_tier === 'silver' ? 'bg-slate-50 border-slate-200 text-slate-500' :
                          'bg-amber-50 border-amber-200 text-amber-600';
                        return (
                          <div
                            key={badge.id}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center text-center shadow-soft group relative cursor-help ${tierColor}`}
                            title={badge.parent_note || 'Otorgada por mamá/papá'}
                          >
                            <span className="text-xl">{dim?.emoji || '🎖️'}</span>
                            <span className="text-[10px] font-bold mt-1 leading-tight">
                              {dim?.name.replace('Valle de los ', '').replace('Lago de la ', '').replace('Bosque de la ', '').replace('Montañas del ', '').replace('Reino de la ', '') || 'Badge'}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">
                              {badge.badge_tier}
                            </span>
                          </div>
                        );
                      })}

                      {badges.length === 0 && (
                        <p className="col-span-3 text-stone-400 text-center py-4 text-xs italic">
                          Aún no tienes insignias. ¡Esfuérzate para que tus padres te otorguen una!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Memories Timeline Section */}
                  <div className="flex flex-col gap-2 mt-4">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Línea del Tiempo
                    </h4>

                    <div className="flex flex-col gap-3 border-l border-stone-150 ml-2 pl-4">
                      {memories.map(mem => (
                        <div key={mem.id} className="relative text-xs">
                          {/* Circle indicator */}
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-white" />
                          <span className="text-[10px] text-stone-400 leading-none">
                            {new Date(mem.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                          
                          <p className="font-semibold text-stone-700 mt-0.5">
                            {mem.memory_type === 'routine_streak_milestone' && `Completada rutina de ${mem.metadata.routine_title}`}
                            {mem.memory_type === 'difficult_checkin' && `Superaste un momento difícil`}
                            {mem.memory_type === 'adventure_complete' && `Completada aventura: ${mem.metadata.adventure_title}`}
                            {mem.memory_type === 'parent_badge_award' && `Recibiste insignia de ${mem.metadata.badge_name}`}
                          </p>

                          {mem.memory_type === 'difficult_checkin' && mem.metadata.emotion_word && (
                            <p className="text-stone-400 text-[10px] mt-0.5">
                              Identificaste el sentimiento de &quot;{mem.metadata.emotion_word}&quot;
                            </p>
                          )}
                        </div>
                      ))}

                      {memories.length === 0 && (
                        <p className="text-stone-400 text-left py-4 text-xs italic">
                          No hay recuerdos grabados aún. Completar rutinas y registrar emociones creará recuerdos.
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REWARDS MODAL */}
      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRewards(false);
                setIsRequesting(false);
              }}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-sm w-full flex flex-col gap-4"
            >
              {isRequesting ? (
                // PROPOSE A REWARD FORM
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!session?.family?.id || !profile?.id) return;
                    if (!requestTitle.trim()) {
                      setRequestError('Por favor, escribe un título.');
                      return;
                    }
                    setRequestSubmitting(true);
                    setRequestError('');

                    const res = await rewardsAdapter.createRewardRequest(session.family.id, profile.id, {
                      title: requestTitle.trim(),
                      emoji: requestEmoji
                    });

                    setRequestSubmitting(false);

                    if (res.ok) {
                      const requestsRes = await rewardsAdapter.getRewardRequests(session.family.id);
                      if (requestsRes.ok) {
                        const pending = requestsRes.data.filter(r => r.status === 'pending' && r.child_id === profile.id);
                        setRewardRequests(pending);
                      }
                      setIsRequesting(false);
                    } else {
                      setRequestError('Error al enviar: ' + res.error.message);
                    }
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                      <span>💡</span> Pedir Premio
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRequesting(false)}
                      className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 font-body">
                    Escribe qué premio te gustaría pedir a tus padres y elige un emoji.
                  </p>

                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-body">
                        ¿Qué te gustaría pedir?
                      </span>
                      <input
                        type="text"
                        value={requestTitle}
                        onChange={e => setRequestTitle(e.target.value)}
                        placeholder="Ej: Tarde de cine, Ir a por helado..."
                        maxLength={40}
                        required
                        className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-200 text-sm text-stone-700 bg-stone-50/50"
                      />
                    </label>

                    <div className="flex flex-col gap-1.5 font-body">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Elige un emoji
                      </span>
                      <div className="flex gap-2">
                        <span className="w-12 h-12 flex items-center justify-center text-2xl bg-stone-100 border border-stone-200 rounded-2xl">
                          {requestEmoji}
                        </span>
                        <div className="flex-1 flex flex-wrap gap-1 items-center bg-stone-50 p-2 rounded-2xl border border-stone-100 max-h-[80px] overflow-y-auto">
                          {['🍕', '🎮', '🛝', '🍿', '🧸', '🍦', '🚴', '🎁', '🎬', '📚', '🍩', '🎈', '🎠'].map(item => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setRequestEmoji(item)}
                              className={`
                                w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-stone-200 transition-all cursor-pointer
                                ${requestEmoji === item ? 'bg-bloom-100 border border-bloom-300' : ''}
                              `}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {requestError && (
                    <p className="text-xs text-red-500 text-center font-body">{requestError}</p>
                  )}

                  <div className="flex gap-2.5 mt-2 font-body">
                    <button
                      type="button"
                      onClick={() => setIsRequesting(false)}
                      className="flex-1 text-xs font-bold py-2.5 rounded-2xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={requestSubmitting}
                      className="flex-1 text-xs font-bold py-2.5 rounded-2xl bg-bloom-500 hover:bg-bloom-600 text-white transition-colors shadow-soft"
                    >
                      {requestSubmitting ? 'Enviando...' : 'Enviar petición'}
                    </button>
                  </div>
                </form>
              ) : (
                // STANDARD REWARDS CATALOG
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                      <span>🎁</span> Recompensas
                    </h3>
                    <button
                      onClick={() => setShowRewards(false)}
                      className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 font-body">
                    Usa tus sparks ✦ ganadas con esfuerzo para canjear recompensas.
                  </p>

                  <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {rewards.map(reward => {
                      const canAfford = sparkBalance >= reward.cost;
                      const isRedeeming = redeemingId === reward.id;
                      const lastRedeemTime = lastRedemptions[reward.id];
                      const cooldown = getCooldownStatus(reward, lastRedeemTime);

                      return (
                        <div
                          key={reward.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-sm ${
                            cooldown.isLocked
                              ? 'bg-stone-100/50 border-stone-200/80 grayscale opacity-70'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{reward.emoji}</span>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-stone-700">
                                {reward.title}
                              </span>
                              <span className="text-xs font-bold text-amber-600 mt-0.5">
                                {reward.cost} Sparks ✦
                              </span>
                            </div>
                          </div>

                          <button
                            disabled={!canAfford || isRedeeming || cooldown.isLocked}
                            onClick={() => handleRedeem(reward.id, reward.title, reward.cost)}
                            className={`
                              text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200
                              ${isRedeeming
                                ? 'bg-stone-200 text-stone-400 cursor-wait'
                                : cooldown.isLocked
                                ? 'bg-stone-100 text-stone-450 border border-stone-200 cursor-not-allowed'
                                : canAfford
                                ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.96] cursor-pointer shadow-soft'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              }
                            `}
                          >
                            {isRedeeming
                              ? 'Canjeando...'
                              : cooldown.isLocked
                              ? `⌛ ${cooldown.text}`
                              : canAfford
                              ? 'Canjear'
                              : 'Faltan sparks'}
                          </button>
                        </div>
                      );
                    })}

                    {rewards.length === 0 && (
                      <p className="text-stone-400 text-center py-8 text-sm italic font-body">
                        Habla con tus padres para añadir recompensas a tu catálogo.
                      </p>
                    )}
                  </div>

                  {/* PENDING REQUESTS */}
                  {rewardRequests.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2 border-t border-stone-100 pt-3">
                      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-body">
                        Tus propuestas pendientes
                      </h4>
                      <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {rewardRequests.map(req => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-xs"
                          >
                            <span className="font-semibold text-stone-600 flex items-center gap-2">
                              <span className="text-base">{req.emoji}</span> {req.title}
                            </span>
                            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                              ⏳ Pendiente
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROPOSE BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRequesting(true);
                      setRequestTitle('');
                      setRequestEmoji('🎁');
                      setRequestError('');
                    }}
                    className="w-full text-xs font-bold py-2.5 rounded-2xl bg-bloom-50 text-bloom-600 border border-bloom-100 hover:bg-bloom-100 transition-colors shadow-soft mt-1.5 flex items-center justify-center gap-1.5 cursor-pointer font-body"
                  >
                    <span>💡</span> Proponer un premio
                  </button>

                  <div className="text-center mt-2 border-t border-stone-100 pt-2">
                    <span className="text-xs text-stone-400 font-body">
                      Tu saldo actual: <strong className="text-amber-500">{sparkBalance} Sparks ✦</strong>
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WORLDS MODAL */}
      <AnimatePresence>
        {showWorldsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWorldsModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-md w-full flex flex-col gap-4 max-h-[85dvh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                  <span>🗺️</span> Mundos Emocionales
                </h3>
                <button
                  onClick={() => setShowWorldsModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              <p className="text-xs text-stone-500 font-body">
                Tu evolución real hace crecer y florecer cada zona. Elige qué mundo quieres visitar hoy:
              </p>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {WORLD_THEMES.map(world => {
                  const score = scores[world.dimension] ?? 0;
                  const phase = getWorldPhase(score);
                  const isSelected = selectedWorld.id === world.id;

                  return (
                    <button
                      key={world.id}
                      onClick={() => {
                        setSelectedWorld(world);
                        setShowWorldsModal(false);
                      }}
                      className={`
                        w-full text-left p-4 rounded-3xl border transition-all duration-300 shadow-sm flex items-center justify-between gap-4 cursor-pointer
                        ${isSelected
                          ? 'bg-stone-50 border-stone-300 ring-2 ring-stone-200 scale-[1.01]'
                          : 'bg-white border-stone-150 hover:bg-stone-50/55 hover:scale-[1.005]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{world.emoji}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-stone-700">{world.name}</span>
                          <span className="text-xs text-stone-400 mt-0.5 max-w-[200px] leading-relaxed">
                            {world.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[10px] text-stone-400 uppercase tracking-widest leading-none">
                          Estado
                        </span>
                        <span className="text-xs font-semibold text-stone-600 mt-1 flex items-center gap-1">
                          {phase.label} {phase.icon}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomizationModal
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        sparkBalance={sparkBalance}
        onPurchaseSuccess={() => {}} // SparkProvider automatically syncs spark balances in realtime
      />
    </div>
  );
}
