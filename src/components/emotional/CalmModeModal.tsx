'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CalmModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companionName?: string;
}

type Phase = 'inhale' | 'hold' | 'exhale';

export function CalmModeModal({ isOpen, onClose, companionName = 'Lumi' }: CalmModeModalProps) {
  const [phase, setPhase] = useState<Phase>('inhale');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [cycleCount, setCycleCount] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setPhase('inhale');
      setSecondsLeft(60);
      setCycleCount(0);
      return;
    }

    // 60-second countdown
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Breathing cycle: 4s inhale, 4s hold, 6s exhale (14s cycle)
  useEffect(() => {
    if (!isOpen || secondsLeft === 0) return;

    let timeout: NodeJS.Timeout;

    if (phase === 'inhale') {
      timeout = setTimeout(() => setPhase('hold'), 4000);
    } else if (phase === 'hold') {
      timeout = setTimeout(() => setPhase('exhale'), 4000);
    } else if (phase === 'exhale') {
      timeout = setTimeout(() => {
        setCycleCount((c) => c + 1);
        setPhase('inhale');
      }, 6000);
    }

    return () => clearTimeout(timeout);
  }, [isOpen, phase, secondsLeft]);

  if (!isOpen) return null;

  const phaseInstruction = {
    inhale: 'Inhala suavemente...',
    hold: 'Sostén el aire...',
    exhale: 'Exhala despacio...',
  }[phase];

  const phaseSubtext = {
    inhale: 'Siente el aire fresco como la brisa del lago.',
    hold: 'Guarda esa calma dentro de ti.',
    exhale: 'Deja ir cualquier tensión o cansancio.',
  }[phase];

  const circleScale = {
    inhale: 1.35,
    hold: 1.35,
    exhale: 0.85,
  }[phase];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-teal-900/90 via-slate-900/95 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-teal-500/30 overflow-hidden text-center space-y-6"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-teal-200/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar modo calma"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-500/20 rounded-full text-teal-300 text-xs font-medium border border-teal-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Espacio de Calma con {companionName}</span>
            </div>
            <h2 className="text-xl font-bold tracking-wide text-teal-100">Respira Conmigo</h2>
          </div>

          {/* Animated Breathing Blob / Orb */}
          <div className="relative py-8 flex items-center justify-center min-h-[220px]">
            {/* Outer Glow Ring */}
            <motion.div
              animate={{ scale: circleScale }}
              transition={{ duration: phase === 'exhale' ? 6 : 4, ease: 'easeInOut' }}
              className="absolute w-44 h-44 rounded-full bg-teal-400/20 blur-xl"
            />

            {/* Inner Breathing Sphere */}
            <motion.div
              animate={{ scale: circleScale }}
              transition={{ duration: phase === 'exhale' ? 6 : 4, ease: 'easeInOut' }}
              className="w-36 h-36 rounded-full bg-gradient-to-tr from-teal-400 via-sky-300 to-emerald-300 shadow-lg shadow-teal-500/40 flex items-center justify-center"
            >
              <Heart className="w-12 h-12 text-teal-900/70 fill-teal-900/40 animate-pulse" />
            </motion.div>
          </div>

          {/* Instructions */}
          <div className="space-y-2 min-h-[70px]">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-2xl font-bold text-teal-200"
            >
              {secondsLeft > 0 ? phaseInstruction : '¡Lo has hecho genial! 🌸'}
            </motion.p>
            <p className="text-xs text-teal-300/80 max-w-xs mx-auto">
              {secondsLeft > 0 ? phaseSubtext : 'Siente el espacio tranquilo que has creado.'}
            </p>
          </div>

          {/* Timer & Cycle Counter */}
          <div className="flex items-center justify-between text-xs text-teal-400/80 border-t border-teal-500/20 pt-4">
            <span>Tiempo restante: {secondsLeft}s</span>
            <span>Respiraciones: {cycleCount}</span>
          </div>

          {/* Exit / Done Button */}
          <Button
            onClick={onClose}
            className="w-full bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold py-3 rounded-2xl transition-all shadow-lg shadow-teal-500/20"
          >
            {secondsLeft === 0 ? 'Me siento mejor 🌸' : 'Terminar sesión'}
          </Button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
