'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BadgeCelebrationOverlayProps {
  dimensionId: string;
  tier: 'bronze' | 'silver' | 'gold';
  parentNote: string;
  onClose: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
  type: 'circle' | 'star' | 'medal';
}

const PARTICLE_COLORS = ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
const VALUE_LABELS: Record<string, string> = {
  autonomy: 'Autonomía',
  empathy: 'Empatía',
  regulation: 'Regulación Emocional',
  connection: 'Constancia',
  courage: 'Valentía',
  curiosity: 'Creatividad',
};

const TIER_COLORS = {
  gold: {
    from: 'from-yellow-400 to-amber-300',
    text: 'text-yellow-600 dark:text-yellow-400',
    label: 'Medalla de Oro',
    shadow: 'shadow-yellow-400/30',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20'
  },
  silver: {
    from: 'from-slate-300 to-slate-200',
    text: 'text-slate-600 dark:text-slate-400',
    label: 'Medalla de Plata',
    shadow: 'shadow-slate-300/30',
    bg: 'bg-slate-50 dark:bg-slate-950/20'
  },
  bronze: {
    from: 'from-amber-650 to-amber-500',
    text: 'text-amber-700 dark:text-amber-500',
    label: 'Medalla de Bronce',
    shadow: 'shadow-amber-600/30',
    bg: 'bg-amber-50 dark:bg-amber-950/20'
  }
};

const DIMENSION_EMOJIS: Record<string, string> = {
  autonomy: '↟',
  empathy: '♡',
  regulation: '☯',
  connection: '♾',
  courage: '▲',
  curiosity: '✦',
};

const StarSvg = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" className="drop-shadow-sm">
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
  </svg>
);

const generateParticles = (count = 75): Particle[] => {
  return Array.from({ length: count }).map((_, idx) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 120 + Math.random() * 280; // spread radius
    return {
      id: idx,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 10 + Math.random() * 18,
      rotate: Math.random() * 720,
      type: Math.random() > 0.55 ? 'star' : Math.random() > 0.2 ? 'circle' : 'medal'
    };
  });
};

export function BadgeCelebrationOverlay({ dimensionId, tier, parentNote, onClose }: BadgeCelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(generateParticles(75));
    playFanfareChime();
  }, []);

  function playFanfareChime() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    try {
      const ctx = new AudioContext();
      
      const playTone = (freq: number, start: number, duration: number, volume = 0.2) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      };

      playTone(261.63, 0.0, 0.6); // C4
      playTone(329.63, 0.1, 0.6); // E4
      playTone(392.00, 0.2, 0.6); // G4
      playTone(523.25, 0.3, 0.8, 0.25); // C5
      
      playTone(329.63, 0.45, 1.2, 0.15); // E4
      playTone(392.00, 0.45, 1.2, 0.15); // G4
      playTone(523.25, 0.45, 1.5, 0.25); // C5
      playTone(659.25, 0.45, 1.5, 0.2);  // E5
    } catch (err) {
      console.warn('Audio Context error:', err);
    }
  }

  const label = VALUE_LABELS[dimensionId] || dimensionId;
  const emoji = DIMENSION_EMOJIS[dimensionId] || '🏅';
  const tierCfg = TIER_COLORS[tier] || TIER_COLORS.gold;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/70 backdrop-blur-xl pointer-events-auto"
      />

      <div className="relative w-full max-w-sm pointer-events-none flex items-center justify-center">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
          >
            {p.type === 'star' ? (
              <motion.div
                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1.4, 1, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 2.2 + Math.random() * 0.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.1,
                }}
              >
                <StarSvg color={p.color} size={p.size} />
              </motion.div>
            ) : p.type === 'medal' ? (
              <motion.div
                className="text-lg animate-pulse"
                initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1.4, 1, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 2.5 + Math.random() * 0.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.05,
                }}
              >
                🏅
              </motion.div>
            ) : (
              <motion.div
                className="rounded-full shadow-sm"
                style={{
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                }}
                initial={{ x: 0, y: 0, scale: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1.4, 1, 0],
                }}
                transition={{
                  duration: 2.0 + Math.random() * 0.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.1,
                }}
              />
            )}
          </div>
        ))}

        <motion.div
          initial={{ scale: 0.4, y: 80, opacity: 0, rotate: 8 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 130 }}
          className="relative w-full bg-white/95 dark:bg-stone-900/95 border border-indigo-100 dark:border-stone-800 shadow-3xl rounded-3xl p-6 text-center pointer-events-auto overflow-hidden"
        >
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0, rotate: 360 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 85, delay: 0.25 }}
            className={`w-28 h-28 bg-gradient-to-tr ${tierCfg.from} rounded-full mx-auto flex items-center justify-center shadow-lg ${tierCfg.shadow} mb-5`}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 0.95, 1], rotate: [0, 8, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-24 h-24 bg-white dark:bg-stone-900 rounded-full flex items-center justify-center"
            >
              <span className="text-6xl select-none">{emoji}</span>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`text-xs font-extrabold uppercase tracking-widest ${tierCfg.text}`}
          >
            {tierCfg.label}
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-2xl font-black text-stone-800 dark:text-white mt-1.5 mb-2 leading-tight font-display"
          >
            ¡Has ganado la insignia de {label}!
          </motion.h2>

          {parentNote && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-4.5 mb-6 shadow-soft"
            >
              <p className="text-[9px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-2 font-display">
                Mensaje de tus papás 💛
              </p>
              <p className="text-sm text-stone-700 dark:text-stone-200 italic font-medium font-body leading-relaxed">
                "{parentNote}"
              </p>
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-850 text-white font-extrabold text-base transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-lg hover:shadow-indigo-600/25"
          >
            ¡Súper! Ver en mi colección ✧
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
