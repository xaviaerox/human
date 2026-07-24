'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart, Volume2, VolumeX } from 'lucide-react';
import { useSensoryAudio } from '@/hooks/useSensoryAudio';

interface CalmCornerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASE_CONFIG: Record<BreathPhase, { text: string; duration: number; next: BreathPhase; scale: number; color: string }> = {
  inhale: {
    text: 'Inhala suavemente...',
    duration: 4,
    next: 'hold1',
    scale: 1.4,
    color: 'from-emerald-400 to-teal-500',
  },
  hold1: {
    text: 'Sostén la calma...',
    duration: 4,
    next: 'exhale',
    scale: 1.4,
    color: 'from-teal-400 to-cyan-500',
  },
  exhale: {
    text: 'Exhala despacio...',
    duration: 4,
    next: 'hold2',
    scale: 1.0,
    color: 'from-indigo-400 to-sky-500',
  },
  hold2: {
    text: 'Descansa en paz...',
    duration: 4,
    next: 'inhale',
    scale: 1.0,
    color: 'from-purple-400 to-indigo-500',
  },
};

export function CalmCornerModal({ isOpen, onClose }: CalmCornerModalProps) {
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [completedCycles, setCompletedCycles] = useState(0);
  const { isMuted, toggleMute, playCalmTone } = useSensoryAudio();

  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          const currentConfig = PHASE_CONFIG[phase];
          const nextPhase = currentConfig.next;
          setPhase(nextPhase);
          playCalmTone();
          if (nextPhase === 'inhale') {
            setCompletedCycles((c) => c + 1);
          }
          return PHASE_CONFIG[nextPhase].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, phase, playCalmTone]);

  if (!isOpen) return null;

  const current = PHASE_CONFIG[phase];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-teal-500/20 bg-slate-900/90 p-8 text-center shadow-2xl shadow-teal-500/10"
        >
          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-teal-300 transition-colors"
              aria-label={isMuted ? 'Activar sonido sensorial' : 'Silenciar sonido sensorial'}
              title={isMuted ? 'Sonido desactivado' : 'Sonido activado'}
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5 text-teal-400" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Cerrar Rincón de Calma"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-teal-400 animate-pulse" />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
              Rincón de Calma
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-8">
            Respiración guiada Box Breathing (4-4-4-4) para autorregulación y paz interior.
          </p>

          {/* Breathing Circle Container */}
          <div className="relative my-8 flex h-64 w-full items-center justify-center">
            {/* Outer Soft Ambient Glow */}
            <motion.div
              animate={{
                scale: current.scale,
                opacity: phase === 'inhale' || phase === 'hold1' ? 0.6 : 0.2,
              }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className={`absolute h-48 w-48 rounded-full bg-gradient-to-tr ${current.color} blur-2xl`}
            />

            {/* Main Animated Circle */}
            <motion.div
              animate={{
                scale: current.scale,
              }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-tr ${current.color} shadow-lg shadow-teal-500/20`}
            >
              <div className="flex flex-col items-center justify-center text-white">
                <Heart className="h-8 w-8 mb-1 animate-pulse" />
                <span className="text-3xl font-extrabold">{secondsLeft}s</span>
              </div>
            </motion.div>
          </div>

          {/* Phase Guidance Text */}
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h3 className="text-xl font-semibold text-teal-200 mb-1">{current.text}</h3>
            <p className="text-xs text-slate-400">
              {completedCycles > 0
                ? `¡Has completado ${completedCycles} ${completedCycles === 1 ? 'ciclo' : 'ciclos'} de calma!`
                : 'Tómate todo el tiempo que necesites. Estás a salvo.'}
            </p>
          </motion.div>

          {/* Affirmative Bottom Action */}
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-teal-500/20 py-3.5 px-6 font-semibold text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all duration-200"
          >
            Siento más calma, volver al reino 🌸
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
