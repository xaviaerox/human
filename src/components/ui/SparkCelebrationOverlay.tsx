'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SparkCelebrationOverlayProps {
  delta: number;
  note: string;
  onClose: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
  type: 'circle' | 'star';
}

const PARTICLE_COLORS = ['#fbbf24', '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];

const generateParticles = (count = 70): Particle[] => {
  return Array.from({ length: count }).map((_, idx) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 260; // spread radius
    return {
      id: idx,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 8 + Math.random() * 16,
      rotate: Math.random() * 720,
      type: Math.random() > 0.4 ? 'star' : 'circle'
    };
  });
};

const StarSvg = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" className="drop-shadow-sm">
    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z" />
  </svg>
);

export function SparkCelebrationOverlay({ delta, note, onClose }: SparkCelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(generateParticles(70));
    playSuccessChime();
  }, []);

  function playSuccessChime() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    try {
      const ctx = new AudioContext();
      
      // Beautiful pentatonic rising chime sequence (gentle sound)
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.55);
      });
    } catch (err) {
      console.warn('Audio Context error (likely blocked by autoplay rules):', err);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop blur with dark transparency */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-lg"
      />

      <div className="relative w-full max-w-sm pointer-events-none flex items-center justify-center">
        {/* Confetti Explosion particles */}
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
                  scale: [0, 1.3, 1, 0],
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 2.0 + Math.random() * 0.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.1,
                }}
              >
                <StarSvg color={p.color} size={p.size} />
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
                  scale: [0, 1.3, 1, 0],
                }}
                transition={{
                  duration: 1.8 + Math.random() * 0.5,
                  ease: 'easeOut',
                  delay: Math.random() * 0.1,
                }}
              />
            )}
          </div>
        ))}

        {/* Celebration Card */}
        <motion.div
          initial={{ scale: 0.5, y: 50, opacity: 0, rotate: -5 }}
          animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.8, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 150 }}
          className="relative w-full bg-white/95 dark:bg-stone-900/95 border border-white/20 shadow-2xl rounded-3xl p-6 text-center pointer-events-auto overflow-hidden"
        >
          {/* Decorative Glowing Rings */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Glowing rotating Gold Star */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 80, delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-amber-400/30 mb-4"
          >
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-5xl"
            >
              ✦
            </motion.span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-4xl font-extrabold text-amber-500 tracking-tight"
          >
            +{delta} {delta === 1 ? 'Estrella' : 'Estrellas'}
          </motion.h2>

          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-xl font-bold text-stone-800 dark:text-stone-100 mt-1 mb-4"
          >
            ¡Enhorabuena! 🌟
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55 }}
            className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 rounded-2xl p-4 mb-6 shadow-sm"
          >
            <p className="text-[10px] font-extrabold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-1.5">
              Por tu gran labor
            </p>
            <p className="text-base text-stone-700 dark:text-stone-200 italic font-medium leading-relaxed">
              "{note}"
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-base transition-colors cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/25"
          >
            ¡Genial! Gracias 💛
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
