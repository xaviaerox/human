'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { useProgression } from '@/lib/progression/ProgressionProvider';
import { useSparks } from '@/lib/sparks/SparkProvider';
import { supabase } from '@/lib/supabase';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RoutinesToday } from '@/components/routines/RoutinesToday';
import { ActiveGoalStep } from '@/components/goals/ActiveGoalStep';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { CheckinPromptCard } from '@/components/emotional/CheckinPromptCard';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { getRewardsAdapter, getGoalsAdapter } from '@/lib/adapters';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { SparkCelebrationOverlay } from '@/components/ui/SparkCelebrationOverlay';
import { ChildAvatar } from '@/components/ui/ChildAvatar';
import { CustomizationModal } from '@/components/companion/CustomizationModal';
import { CompanionChatModal } from '@/components/companion/CompanionChatModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { getSuggestedWords } from '@/lib/emotional/EmotionModel';

import { useRouter } from 'next/navigation';
import type { Reward, RewardRequest, ValueDimensionId, ChildBadge, CompanionMemory, DialogueLine } from '@/types';

const rewardsAdapter = getRewardsAdapter();
const goalsAdapter = getGoalsAdapter();

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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin-windmill {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes waterfall-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -20; }
        }
        @keyframes float-cloud {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(8px) translateY(-2px); }
        }
        @keyframes float-balloon {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-8px) translateX(2px); }
        }
        @keyframes glow-seed {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.6)); opacity: 0.85; }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 12px rgba(251, 191, 36, 1)); opacity: 1; }
        }
        @keyframes flag-flap {
          0%, 100% { transform: skewY(0deg) scaleX(1); }
          50% { transform: skewY(-4deg) scaleX(0.95); }
        }
        @keyframes eagle-soar {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(-12px, -6px) scale(0.95) rotate(-3deg); }
        }
        .anim-windmill {
          animation: spin-windmill 12s linear infinite;
          transform-origin: 18px 50px;
        }
        .anim-waterfall {
          stroke-dasharray: 4, 4;
          animation: waterfall-flow 1.2s linear infinite;
        }
        .anim-cloud {
          animation: float-cloud 7s ease-in-out infinite;
        }
        .anim-balloon {
          animation: float-balloon 5s ease-in-out infinite;
          transform-origin: 82px 55px;
        }
        .anim-seed-pulse {
          animation: glow-seed 2s ease-in-out infinite;
        }
        .anim-flag {
          animation: flag-flap 1.5s ease-in-out infinite;
          transform-origin: 22px 22px;
        }
        .anim-eagle {
          animation: eagle-soar 8s ease-in-out infinite;
          transform-origin: 78px 30px;
        }
      `}} />

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. LAGO DE LA CALMA */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'lago_calma' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-sky-900 to-blue-900 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-300 to-blue-500" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="calmWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="doubleRainbow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
                <stop offset="25%" stopColor="rgba(245,158,11,0.25)" />
                <stop offset="50%" stopColor="rgba(16,185,129,0.25)" />
                <stop offset="75%" stopColor="rgba(59,130,246,0.25)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.25)" />
              </linearGradient>
              <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Hills */}
            <path d="M 0 55 Q 20 48 40 55 T 80 50 T 100 56 L 100 100 L 0 100 Z" fill="#0369a1" opacity={phase === 'bloom' ? 0.35 : phase === 'sprout' ? 0.2 : 0.15} />

            {/* Water layers */}
            <path d="M 0 65 Q 25 58 50 64 T 100 60 L 100 100 L 0 100 Z" fill="url(#calmWater)" opacity={phase === 'bloom' ? 0.8 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 78 Q 30 72 60 79 T 100 74 L 100 100 L 0 100 Z" fill="#0284c7" opacity={phase === 'bloom' ? 0.9 : phase === 'sprout' ? 0.6 : 0.4} />

            {/* Rainbow - only in Bloom */}
            {phase === 'bloom' && (
              <>
                <path d="M -10 65 Q 50 -10 110 65" fill="none" stroke="url(#doubleRainbow)" strokeWidth="6" />
                <path d="M -15 65 Q 50 -18 115 65" fill="none" stroke="url(#doubleRainbow)" strokeWidth="3" opacity="0.6" />
              </>
            )}

            {/* Mist overlay - only in Seed */}
            {phase === 'seed' && (
              <>
                <path d="M -20 60 Q 20 50 60 62 T 120 58 L 120 75 L -20 75 Z" fill="#475569" opacity="0.25" />
                <path d="M -10 68 Q 30 60 70 70 T 110 65 L 110 85 L -10 85 Z" fill="#334155" opacity="0.2" />
              </>
            )}

            {/* Waterfall on Left - only in Sprout (thin) and Bloom (epic) */}
            {phase === 'sprout' && (
              <g>
                <rect x="8" y="25" width="3" height="40" fill="#a5f3fc" opacity="0.7" />
                <line x1="9.5" y1="25" x2="9.5" y2="65" stroke="#ffffff" strokeWidth="0.8" className="anim-waterfall" />
              </g>
            )}

            {phase === 'bloom' && (
              <g>
                {/* Rocks */}
                <path d="M 0 20 L 14 20 L 12 66 L 0 66 Z" fill="#334155" />
                <path d="M 0 35 L 17 38 L 16 66 L 0 66 Z" fill="#1e293b" opacity="0.7" />
                {/* Main waterfall */}
                <rect x="2" y="20" width="10" height="46" fill="#7dd3fc" />
                {/* Flow lines */}
                <line x1="3.5" y1="20" x2="3.5" y2="66" stroke="#f0f9ff" strokeWidth="1.2" className="anim-waterfall" />
                <line x1="7" y1="20" x2="7" y2="66" stroke="#ffffff" strokeWidth="1" className="anim-waterfall" />
                <line x1="10.5" y1="20" x2="10.5" y2="66" stroke="#e0f2fe" strokeWidth="1.2" className="anim-waterfall" />
                {/* Splashes */}
                <ellipse cx="7" cy="65" rx="6" ry="2" fill="#ffffff" opacity="0.9" />
                <circle cx="4" cy="64" r="1.5" fill="#e0f2fe" opacity="0.8" />
                <circle cx="10" cy="64" r="1.5" fill="#e0f2fe" opacity="0.8" />
              </g>
            )}

            {/* Seed / Sprout / Bloom right-aligned lilypad & lotus */}
            {phase === 'seed' && (
              <g transform="translate(80, 72) scale(0.65)" className="anim-seed-pulse">
                {/* Lily pad */}
                <ellipse cx="0" cy="5" rx="15" ry="5" fill="#1e293b" />
                {/* Golden magical seed */}
                <circle cx="0" cy="0" r="6" fill="url(#goldGlow)" />
                <circle cx="0" cy="0" r="3" fill="#fef08a" />
              </g>
            )}

            {phase === 'sprout' && (
              <g transform="translate(80, 72) scale(0.7)">
                {/* Lily pad */}
                <ellipse cx="0" cy="5" rx="16" ry="6" fill="#065f46" />
                {/* Sprout bud */}
                <path d="M 0 -12 C -6 -6 -5 4 0 5 C 5 4 6 -6 0 -12 Z" fill="#10b981" />
                <path d="M -4 -8 C -10 -2 -5 4 0 5 Z" fill="#059669" />
                <circle cx="0" cy="-3" r="2" fill="#fef08a" opacity="0.8" className="animate-pulse" />
              </g>
            )}

            {phase === 'bloom' && (
              <g transform="translate(80, 72) scale(0.75)">
                {/* Lily pad */}
                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#065f46" />
                <path d="M -20 6 L -10 6 L -8 8 L -18 8 Z" fill="#044e39" />
                {/* Lotus flower */}
                <g>
                  {/* Outer pink petals */}
                  <path d="M -15 -2 C -24 -12 -12 -22 0 -10 C -12 -22 -24 -12 -15 -2 Z" fill="#f43f5e" opacity="0.9" />
                  <path d="M 15 -2 C 24 -12 12 -22 0 -10 C 12 -22 24 -12 15 -2 Z" fill="#f43f5e" opacity="0.9" />
                  {/* Inner light pink petals */}
                  <path d="M -10 -4 C -18 -12 -8 -20 0 -8 Z" fill="#fda4af" />
                  <path d="M 10 -4 C 18 -12 8 -20 0 -8 Z" fill="#fda4af" />
                  {/* Center glowing golden seed */}
                  <circle cx="0" cy="-6" r="5" fill="url(#goldGlow)" />
                  <circle cx="0" cy="-6" r="2.5" fill="#ffffff" />
                </g>
              </g>
            )}
          </svg>

          {/* Floating effects */}
          {phase === 'seed' && (
            <div className="absolute bottom-6 left-[80%] -translate-x-1/2 text-xs text-yellow-300/60 animate-pulse">✨</div>
          )}
          {phase === 'sprout' && (
            <div className="absolute bottom-12 left-[80%] -translate-x-1/2 text-[10px] animate-bounce text-cyan-300">💧</div>
          )}
          {phase === 'bloom' && (
            <>
              <div className="absolute w-2.5 h-2.5 rounded-full bg-white/50 bottom-14 left-[76%] animate-ambient-float-up" />
              <div className="absolute w-2 h-2 rounded-full bg-white/60 bottom-24 left-[84%] animate-ambient-float-up" style={{ animationDelay: '1.5s' }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-200/40 bottom-8 left-[18%] animate-ambient-float-up" style={{ animationDelay: '0.8s' }} />
              <div className="absolute w-3 h-3 rounded-full bg-sky-200/30 bottom-20 left-[12%] animate-ambient-float-up" style={{ animationDelay: '2.5s' }} />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. VALLE DE LOS HÁBITOS */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'valle_habitos' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-green-100 to-emerald-250 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-orange-250 via-pink-100 to-green-300" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="valleHills1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="valleHills2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#166534" />
              </linearGradient>
              <radialGradient id="seedGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                <stop offset="60%" stopColor="#ea580c" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Hills */}
            <path d="M 0 58 Q 25 48 50 58 T 100 52 L 100 100 L 0 100 Z" fill={phase === 'bloom' ? 'url(#valleHills1)' : phase === 'sprout' ? '#86efac' : '#78716c'} opacity={0.8} />
            <path d="M 0 70 Q 35 62 70 72 T 100 66 L 100 100 L 0 100 Z" fill={phase === 'bloom' ? 'url(#valleHills2)' : phase === 'sprout' ? '#4ade80' : '#57534e'} opacity={0.9} />

            {/* Seed: left-aligned brown seed pulsing */}
            {phase === 'seed' && (
              <g transform="translate(20, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="12" ry="4" fill="#44403c" />
                <circle cx="0" cy="0" r="7" fill="url(#seedGlow)" />
                <path d="M -3 0 C -3 -5 3 -5 3 0 Z" fill="#78350f" />
              </g>
            )}

            {/* Sprout: sapling on the right */}
            {phase === 'sprout' && (
              <g transform="translate(82, 68) scale(0.75)">
                {/* Trunk */}
                <path d="M -1.5 15 L -1 0 L 1 0 L 1.5 15 Z" fill="#7c2d12" />
                {/* Leaves */}
                <circle cx="0" cy="-6" r="8" fill="#15803d" />
                <circle cx="-5" cy="-3" r="6" fill="#166534" />
                <circle cx="5" cy="-3" r="6" fill="#22c55e" />
              </g>
            )}

            {/* Bloom: Windmill on left, big Apple Tree on right, flowers */}
            {phase === 'bloom' && (
              <>
                {/* Windmill (Left, x=18) */}
                <g>
                  {/* Tower */}
                  <polygon points="12,74 15,50 21,50 24,74" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="0.5" />
                  <polygon points="15,50 18,44 21,50" fill="#7c2d12" />
                  {/* Door */}
                  <rect x="16" y="66" width="4" height="8" rx="1" fill="#7c2d12" />
                  {/* Spinning sails */}
                  <g className="anim-windmill">
                    <line x1="18" y1="50" x2="18" y2="30" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="18,30 22,34 18,44 14,34" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="18" y2="70" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="18,70 22,66 18,56 14,66" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="38" y2="50" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="38,50 34,46 24,50 34,54" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="-2" y2="50" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="-2,50 2,46 12,50 2,54" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <circle cx="18" cy="50" r="2" fill="#f59e0b" />
                  </g>
                </g>

                {/* Apple Tree (Right, x=82) */}
                <g transform="translate(82, 65) scale(0.8)">
                  {/* Trunk */}
                  <path d="M -4 20 L -2 -4 L 2 -4 L 4 20 Z" fill="#78350f" />
                  <path d="M -2 -4 Q -10 -15 -12 -12" fill="none" stroke="#78350f" strokeWidth="2.5" />
                  <path d="M 2 -4 Q 10 -15 12 -12" fill="none" stroke="#78350f" strokeWidth="2" />
                  {/* Foliage */}
                  <circle cx="0" cy="-15" r="18" fill="#15803d" />
                  <circle cx="-12" cy="-8" r="14" fill="#166534" />
                  <circle cx="12" cy="-8" r="14" fill="#15803d" />
                  <circle cx="-8" cy="-22" r="12" fill="#166534" />
                  <circle cx="8" cy="-22" r="12" fill="#22c55e" />
                  {/* Apples */}
                  <circle cx="-6" cy="-8" r="2.5" fill="#ef4444" />
                  <circle cx="6" cy="-14" r="2.5" fill="#ef4444" />
                  <circle cx="2" cy="-5" r="2.5" fill="#ef4444" />
                  <circle cx="-8" cy="-20" r="2.5" fill="#ef4444" />
                  <circle cx="8" cy="-10" r="2.5" fill="#ef4444" />
                  <circle cx="0" cy="-24" r="2.5" fill="#ef4444" />
                </g>

                {/* Wildflowers */}
                <g transform="translate(14, 76) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#db2777" />
                  <circle cx="-5" cy="0" r="3" fill="#fbcfe8" /><circle cx="5" cy="0" r="3" fill="#fbcfe8" />
                  <circle cx="0" cy="-5" r="3" fill="#fbcfe8" /><circle cx="0" cy="5" r="3" fill="#fbcfe8" />
                </g>
                <g transform="translate(24, 79) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#ca8a04" />
                  <circle cx="-5" cy="0" r="3" fill="#fef08a" /><circle cx="5" cy="0" r="3" fill="#fef08a" />
                  <circle cx="0" cy="-5" r="3" fill="#fef08a" /><circle cx="0" cy="5" r="3" fill="#fef08a" />
                </g>
                <g transform="translate(74, 73) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#2563eb" />
                  <circle cx="-5" cy="0" r="3" fill="#93c5fd" /><circle cx="5" cy="0" r="3" fill="#93c5fd" />
                  <circle cx="0" cy="-5" r="3" fill="#93c5fd" /><circle cx="0" cy="5" r="3" fill="#93c5fd" />
                </g>
              </>
            )}
          </svg>

          {/* Falling Leaves & Petals - only in Sprout and Bloom */}
          {phase === 'sprout' && (
            <div className="absolute top-6 right-[20%] text-xs opacity-60 animate-ambient-float-down">🍃</div>
          )}
          {phase === 'bloom' && (
            <>
              <div className="absolute top-2 left-6 text-xs animate-ambient-float-down">🌸</div>
              <div className="absolute top-8 right-6 text-[10px] animate-ambient-float-down" style={{ animationDelay: '2s' }}>🌸</div>
              <div className="absolute top-14 left-[20%] text-xs animate-ambient-float-down" style={{ animationDelay: '1.2s' }}>🍃</div>
              <div className="absolute top-4 right-[25%] text-[9px] animate-ambient-float-down" style={{ animationDelay: '3.5s' }}>🍃</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. BOSQUE DE LA AUTONOMÍA */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'bosque_autonomia' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-850 to-slate-900 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-teal-900 to-indigo-950 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-teal-950 to-emerald-950" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="bioGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
                <stop offset="50%" stopColor="#059669" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mushGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Silhouette Hills */}
            <path d="M 0 62 Q 25 52 50 62 T 100 58 L 100 100 L 0 100 Z" fill="#022c22" opacity={phase === 'bloom' ? 0.75 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 74 Q 35 66 70 76 T 100 70 L 100 100 L 0 100 Z" fill="#011c14" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.65 : 0.45} />
            <path d="M 0 85 Q 20 80 50 88 T 100 84 L 100 100 L 0 100 Z" fill="#000f0a" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.75 : 0.55} />

            {/* Crescent Moon - in Sprout (faint) and Bloom (bright) */}
            {phase === 'sprout' && (
              <path d="M 12 12 A 6 6 0 1 0 24 17 A 4.5 4.5 0 1 1 12 12 Z" fill="#fef08a" opacity="0.4" />
            )}
            {phase === 'bloom' && (
              <path d="M 14 12 A 7 7 0 1 0 28 18 A 5.5 5.5 0 1 1 14 12 Z" fill="#fef08a" opacity="0.85" filter="drop-shadow(0 0 4px #fef08a)" />
            )}

            {/* Seed: left-aligned bio-luminescent seed */}
            {phase === 'seed' && (
              <g transform="translate(18, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#0c0a09" />
                <circle cx="0" cy="0" r="7" fill="url(#bioGlow)" />
                <circle cx="0" cy="0" r="2" fill="#86efac" />
              </g>
            )}

            {/* Sprout: small glowing mushrooms on left */}
            {phase === 'sprout' && (
              <g transform="translate(18, 75) scale(0.7)">
                {/* Mushrooms */}
                <path d="M -4 10 Q -2 0 -2 -2 L 2 -2 Q 2 0 4 10 Z" fill="#e2e8f0" />
                <path d="M -6 -2 C -6 -7 6 -7 6 -2 Z" fill="#0ea5e9" />
                <circle cx="-1" cy="-4" r="1" fill="#ffffff" />
                <circle cx="2" cy="-3" r="1.5" fill="#ffffff" />
                {/* Glow aura */}
                <circle cx="0" cy="-4" r="8" fill="url(#mushGlow)" opacity="0.4" />
              </g>
            )}

            {/* Bloom: Giant Oak and glowing mushrooms on left, lanterns and pines on right */}
            {phase === 'bloom' && (
              <>
                {/* Oak Tree with glowing mushrooms (Left, x=15) */}
                <g>
                  {/* Trunk */}
                  <path d="M 11 76 L 13 46 Q 10 38 7 35 Q 16 38 17 46 L 19 76 Z" fill="#1f2937" />
                  {/* Foliage */}
                  <circle cx="15" cy="30" r="14" fill="#044e39" />
                  <circle cx="8" cy="36" r="11" fill="#064e3b" />
                  <circle cx="21" cy="34" r="11" fill="#065f46" />
                  {/* Glowing mushrooms at the base */}
                  <g transform="translate(19, 72) scale(0.5)">
                    <path d="M -2 10 Q -1 0 -1 -2 L 1 -2 Q 1 0 2 10 Z" fill="#e2e8f0" />
                    <path d="M -5 -2 C -5 -6 5 -6 5 -2 Z" fill="#38bdf8" />
                    <circle cx="0" cy="-3" r="8" fill="url(#mushGlow)" opacity="0.6" />
                  </g>
                  <g transform="translate(12, 74) scale(0.4)">
                    <path d="M -2 10 Q -1 0 -1 -2 L 1 -2 Q 1 0 2 10 Z" fill="#e2e8f0" />
                    <path d="M -5 -2 C -5 -6 5 -6 5 -2 Z" fill="#10b981" />
                    <circle cx="0" cy="-3" r="8" fill="url(#bioGlow)" opacity="0.6" />
                  </g>
                </g>

                {/* Grand pines with star lanterns (Right, x=85) */}
                <g>
                  {/* Tall Pine */}
                  <g transform="translate(85, 66) scale(0.75)">
                    <rect x="-2.5" y="10" width="5" height="15" fill="#1f2937" />
                    <polygon points="0,-25 -14,-2 14,-2" fill="#022c22" />
                    <polygon points="0,-12 -11,8 11,8" fill="#064e3b" />
                    {/* Hanging Star Lantern */}
                    <line x1="-8" y1="2" x2="-8" y2="8" stroke="#fef08a" strokeWidth="0.8" />
                    <circle cx="-8" cy="10" r="2" fill="#fef08a" filter="drop-shadow(0 0 3px #fef08a)" />
                  </g>
                  {/* Small Pine */}
                  <g transform="translate(93, 72) scale(0.55)">
                    <rect x="-2" y="10" width="4" height="15" fill="#1f2937" />
                    <polygon points="0,-25 -14,-2 14,-2" fill="#022c22" />
                    <polygon points="0,-12 -11,8 11,8" fill="#064e3b" />
                  </g>
                </g>
              </>
            )}
          </svg>

          {/* Twinkling Fireflies - Sprout (few) and Bloom (many) */}
          {phase === 'sprout' && (
            <div className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full blur-[1px] bottom-16 left-[15%] animate-firefly" />
          )}
          {phase === 'bloom' && (
            <>
              <div className="absolute w-2 h-2 bg-yellow-300 rounded-full blur-[1.5px] bottom-20 left-[12%] animate-firefly" />
              <div className="absolute w-1.5 h-1.5 bg-yellow-250 rounded-full blur-[1px] bottom-28 right-[14%] animate-firefly" style={{ animationDelay: '1s' }} />
              <div className="absolute w-2 h-2 bg-green-200 rounded-full blur-[1.5px] bottom-36 left-[22%] animate-firefly" style={{ animationDelay: '2.2s' }} />
              <div className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full blur-[1px] bottom-12 right-[20%] animate-firefly" style={{ animationDelay: '1.5s' }} />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. MONTAÑAS DEL ESFUERZO */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'montana_esfuerzo' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-350 via-slate-100 to-blue-200 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="auroraGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Aurora - Bloom only */}
            {phase === 'bloom' && (
              <>
                <path d="M 0 35 Q 30 15 60 40 T 100 30 L 100 60 L 0 60 Z" fill="url(#auroraGreen)" />
                <path d="M 0 25 Q 40 45 70 20 T 100 35 L 100 65 L 0 65 Z" fill="url(#auroraGreen)" opacity="0.6" />
              </>
            )}

            {/* Mountains */}
            <path d="M 0 100 L 22 38 L 48 76 L 76 44 L 100 85 L 100 100 Z" fill="#475569" opacity={phase === 'bloom' ? 0.75 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 100 L 16 54 L 38 42 L 68 72 L 100 52 L 100 100 Z" fill="#334155" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.6 : 0.4} />
            <path d="M 0 100 L 28 72 L 56 62 L 82 82 L 100 76 L 100 100 Z" fill="#1e293b" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.7 : 0.5} />

            {/* Seed: frozen crystal seed left-aligned */}
            {phase === 'seed' && (
              <g transform="translate(20, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="9" ry="3" fill="#334155" />
                <circle cx="0" cy="0" r="7" fill="url(#crystalGlow)" />
                <polygon points="0,-5 4,0 0,5 -4,0" fill="#e2e8f0" />
              </g>
            )}

            {/* Sprout: icy flower bud */}
            {phase === 'sprout' && (
              <g transform="translate(20, 72) scale(0.7)">
                <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#334155" />
                <path d="M 0 -8 C -4 -4 -3 2 0 3 C 3 2 4 -4 0 -8 Z" fill="#93c5fd" />
                <path d="M -3 -5 C -6 -1 -3 3 0 3 Z" fill="#60a5fa" />
              </g>
            )}

            {/* Bloom: Flag on left peak (x=22), eagle on right (x=78), stars */}
            {phase === 'bloom' && (
              <>
                {/* Snow Caps */}
                <polygon points="22,38 18,46 26,46" fill="#ffffff" />
                <polygon points="38,42 34,49 42,49" fill="#ffffff" />
                <polygon points="76,44 72,51 80,51" fill="#ffffff" />

                {/* Victory Flag (Left, x=22) */}
                <g>
                  {/* Flagpole */}
                  <line x1="22" y1="38" x2="22" y2="22" stroke="#d1d5db" strokeWidth="1" />
                  {/* Flapping flag */}
                  <g className="anim-flag">
                    <polygon points="22,22 22,29 32,25.5" fill="#ef4444" />
                    <circle cx="27" cy="25.5" r="0.8" fill="#fef08a" />
                  </g>
                </g>

                {/* Eagle soaring (Right, x=78) */}
                <g className="anim-eagle" transform="translate(78, 30) scale(0.85)">
                  {/* Bird body / wings */}
                  <path d="M -10 0 Q -5 -6 0 -1 Q 5 -6 10 0 Q 3 2 0 1 Q -3 2 -10 0 Z" fill="#78350f" />
                  <path d="M -6 -1 L -1 -8 L 0 -8 L -4 -1 Z" fill="#d1d5db" />
                </g>
              </>
            )}
          </svg>

          {/* Particle Effects */}
          {phase === 'seed' && (
            <div className="absolute top-8 left-[20%] text-[8px] opacity-40 animate-pulse text-white">❄️</div>
          )}
          {phase === 'sprout' && (
            <div className="absolute top-10 left-[22%] text-[9px] opacity-60 animate-bounce text-sky-100">❄️</div>
          )}
          {phase === 'bloom' && (
            <>
              {/* Twinkling stars */}
              <div className="absolute top-4 left-6 text-xs animate-pulse text-yellow-300">⭐</div>
              <div className="absolute top-10 right-10 text-[9px] animate-pulse text-yellow-200" style={{ animationDelay: '1.2s' }}>⭐</div>
              <div className="absolute top-6 right-[24%] text-xs animate-pulse text-white" style={{ animationDelay: '0.6s' }}>✨</div>
              <div className="absolute top-14 left-[18%] text-[8px] animate-pulse text-sky-200" style={{ animationDelay: '2s' }}>⭐</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. REINO DE LA VIDA SOCIAL */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'reino_social' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-100 via-purple-50 to-pink-200 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-pink-300 via-purple-200 to-fuchsia-400" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rainbowBridge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(244,63,94,0.4)" />
                <stop offset="30%" stopColor="rgba(234,179,8,0.4)" />
                <stop offset="65%" stopColor="rgba(16,185,129,0.4)" />
                <stop offset="100%" stopColor="rgba(99,102,241,0.4)" />
              </linearGradient>
              <linearGradient id="castleWall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a21caf" />
                <stop offset="100%" stopColor="#701a75" />
              </linearGradient>
              <radialGradient id="pinkGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fdf2f8" stopOpacity="1" />
                <stop offset="60%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Silhouette Hills */}
            <path d="M 0 65 Q 20 52 45 62 T 100 58 L 100 100 L 0 100 Z" fill="#c084fc" opacity={phase === 'bloom' ? 0.7 : phase === 'sprout' ? 0.45 : 0.25} />
            <path d="M 0 76 Q 30 68 60 76 T 100 70 L 100 100 L 0 100 Z" fill="#a855f7" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.55 : 0.35} />
            <path d="M 0 86 Q 20 80 50 88 T 100 82 L 100 100 L 0 100 Z" fill="#86198f" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.65 : 0.45} />

            {/* Seed: violet seed right-aligned */}
            {phase === 'seed' && (
              <g transform="translate(80, 75) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="9" ry="3" fill="#581c87" />
                <circle cx="0" cy="0" r="7" fill="url(#pinkGlow)" />
                <path d="M -3 0 C -3 -5 3 -5 3 0 Z" fill="#d946ef" />
              </g>
            )}

            {/* Sprout: floating heart-shaped sprout */}
            {phase === 'sprout' && (
              <g transform="translate(80, 68) scale(0.7)">
                <ellipse cx="0" cy="12" rx="8" ry="2.5" fill="#581c87" opacity="0.3" />
                <path d="M 0 -6 C -4 -10 -8 -5 0 3 C 8 -5 4 -10 0 -6 Z" fill="#ec4899" className="animate-pulse" />
              </g>
            )}

            {/* Bloom: Floating castle on left (x=20), Rainbow bridge, Hot air balloon on right (x=80) */}
            {phase === 'bloom' && (
              <>
                {/* Floating Castle (Left, x=20) */}
                <g>
                  {/* Island cloud base */}
                  <ellipse cx="20" cy="58" rx="14" ry="4" fill="#f8fafc" opacity="0.9" />
                  <ellipse cx="20" cy="60" rx="11" ry="3" fill="#e2e8f0" />
                  {/* Castle Walls & Towers */}
                  <rect x="10" y="38" width="20" height="20" fill="url(#castleWall)" />
                  <rect x="7" y="26" width="6" height="32" fill="#701a75" />
                  <polygon points="7,26 10,16 13,26" fill="#be185d" />
                  <rect x="27" y="26" width="6" height="32" fill="#701a75" />
                  <polygon points="27,26 30,16 33,26" fill="#be185d" />
                  <rect x="17" y="32" width="6" height="12" fill="#be185d" />
                  <polygon points="17,32 20,24 23,32" fill="#fbcfe8" />
                  {/* Door */}
                  <rect x="18" y="48" width="4" height="10" rx="2" fill="#3b0764" />
                </g>

                {/* Rainbow Bridge */}
                <path d="M 28 50 Q 52 38 76 50" fill="none" stroke="url(#rainbowBridge)" strokeWidth="4" />

                {/* Hot Air Balloon (Right, x=80) */}
                <g className="anim-balloon" transform="translate(80, 42) scale(0.65)">
                  {/* Balloon */}
                  <ellipse cx="0" cy="-12" rx="11" ry="13" fill="#ec4899" />
                  {/* Stripes */}
                  <path d="M -7 -20 C -2 -14 -2 -6 -7 0 M 7 -20 C 2 -14 2 -6 7 0" fill="none" stroke="#fbcfe8" strokeWidth="2.5" />
                  {/* Ropes */}
                  <line x1="-5" y1="1" x2="-3" y2="7" stroke="#78350f" strokeWidth="0.8" />
                  <line x1="5" y1="1" x2="3" y2="7" stroke="#78350f" strokeWidth="0.8" />
                  {/* Basket */}
                  <rect x="-3" y="7" width="6" height="5" rx="1" fill="#78350f" />
                </g>

                {/* Clouds */}
                <g className="anim-cloud" transform="translate(74, 20) scale(0.65)">
                  <ellipse cx="12" cy="10" rx="10" ry="3.5" fill="#ffffff" opacity="0.6" />
                  <circle cx="6" cy="7" r="5" fill="#ffffff" opacity="0.6" />
                </g>
              </>
            )}
          </svg>

          {/* Floating Hearts */}
          {phase === 'sprout' && (
            <div className="absolute bottom-16 right-[20%] text-xs animate-ambient-float-up text-pink-300 opacity-60">❤️</div>
          )}
          {phase === 'bloom' && (
            <>
              <div className="absolute bottom-16 left-[15%] text-xs animate-ambient-float-up text-red-400 opacity-90">❤️</div>
              <div className="absolute bottom-24 right-[16%] text-sm animate-ambient-float-up text-pink-400 opacity-95" style={{ animationDelay: '2.5s' }}>💖</div>
              <div className="absolute bottom-28 left-[35%] text-xs animate-ambient-float-up text-rose-400 opacity-80" style={{ animationDelay: '4.5s' }}>💝</div>
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
  const [showChatModal, setShowChatModal] = useState(false);
  const [showWorldsModal, setShowWorldsModal] = useState(false);

  // Active goal context for companion chat
  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [nextTask, setNextTask] = useState<any>(null);

  useEffect(() => {
    if (showChatModal && profile?.id) {
      goalsAdapter.getGoals(profile.id).then(res => {
        if (res.ok) {
          const active = res.data.find(g => g.status === 'active');
          if (active) {
            setActiveGoal(active);
            setNextTask(getNextMicrotask(active.microtasks));
          } else {
            setActiveGoal(null);
            setNextTask(null);
          }
        }
      });
    }
  }, [showChatModal, profile?.id]);

  // Realtime subscription to celebrate new sparks
  useEffect(() => {
    if (!profile?.id || profile.role !== 'child') return;

    const channel = supabase
      .channel(`sparks_celebration:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spark_ledger',
          filter: `child_id=eq.${profile.id}`
        },
        (payload: any) => {
          const entry = payload.new;
          if (entry && entry.delta > 0) {
            setCurrentCelebration({
              id: entry.id,
              delta: entry.delta,
              note: entry.note || '¡Buen trabajo!'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

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
              <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center my-6 rounded-[40px] border border-stone-250/20 bg-white/45 dark:bg-stone-900/10 backdrop-blur-md shadow-card transition-all duration-700">
                {/* Background wrapper (clipping landscapes inside rounded border) */}
                <div className="absolute inset-0 overflow-hidden rounded-[40px] z-0">
                  <WorldAmbientVisuals worldId={selectedWorld.id} phase={activeWorldPhase.phase} />
                </div>

                {/* Companion blob widget (Foreground, allows overflow pop-out) */}
                {isVisible && display && (
                  <div className="z-10 scale-[1.08] relative">
                    <CompanionWidget
                      display={display}
                      dialogue={dialogue}
                      size="lg"
                      onTap={() => setDialogue(getDialogue('free_interaction' as any))}
                    />
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMemoriesModal(true)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-full bg-white/80 border border-stone-205 hover:bg-white text-stone-600 transition-colors shadow-soft flex items-center gap-1.5 cursor-pointer"
                >
                  📖 Recuerdos e Insignias
                </button>
                <button
                  onClick={() => setShowChatModal(true)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-full bg-bloom-50 hover:bg-bloom-100 border border-bloom-200 text-bloom-600 transition-all shadow-soft flex items-center gap-1.5 cursor-pointer hover:scale-[1.03]"
                >
                  💬 Hablar con {display?.name ?? 'Compañero'}
                </button>
              </div>
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
      {/* COMPANION CHAT MODAL */}
      {display && (
        <CompanionChatModal
          isOpen={showChatModal}
          onClose={(lastReply) => {
            setShowChatModal(false);
            if (lastReply) {
              setDialogue({
                text: lastReply,
                animationCue: 'idle',
                durationMs: 4000
              });
            }
          }}
          display={display}
          childId={profile?.id}
          childName={profile?.display_name || 'amigo'}
          childScores={scores}
          activeGoal={activeGoal}
          nextTask={nextTask}
          recentMemories={memories}
          recentCheckins={recentCheckins}
          selectedWorldName={selectedWorld.name}
          activeWorldPhaseLabel={activeWorldPhase.label}
          onInteract={() => interact('free_interaction')}
        />
      )}

      {/* SPARK CELEBRATION OVERLAY */}
      {currentCelebration && (
        <SparkCelebrationOverlay
          delta={currentCelebration.delta}
          note={currentCelebration.note}
          onClose={() => setCurrentCelebration(null)}
        />
      )}
    </div>
  );
}
