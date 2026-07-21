'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BadgeCelebrationOverlayProps {
  dimensionId: string;
  tier: 'bronze' | 'silver' | 'gold';
  parentNote: string;
  companionName?: string;
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
  duration: number;
  delay: number;
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
    const isStar = Math.random() > 0.55;
    const isMedal = !isStar && Math.random() > 0.2;
    const pType = isStar ? 'star' : isMedal ? 'circle' : 'medal';
    const baseDuration = isStar ? 2.2 : isMedal ? 2.5 : 2.0;
    return {
      id: idx,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      size: 10 + Math.random() * 18,
      rotate: Math.random() * 720,
      type: pType,
      duration: baseDuration + Math.random() * 0.5,
      delay: Math.random() * 0.1,
    };
  });
};

function getCompanionCongratulation(dimensionId: string, tier: 'bronze' | 'silver' | 'gold'): string {
  const congrats: Record<string, Record<'bronze' | 'silver' | 'gold', string>> = {
    autonomy: {
      bronze: "¡Mira cómo brillas por ti mismo! Cada paso independiente que das es un paso gigante.",
      silver: "¡Eres un explorador increíble! Estás haciendo tantas cosas por ti mismo, ¡estoy súper orgulloso!",
      gold: "¡Eres el rey de la autonomía! Has demostrado que puedes guiar tu propio camino con gran responsabilidad."
    },
    empathy: {
      bronze: "¡Tu corazón es muy grande! Compartir amor y amabilidad hace que nuestro mundo sea un lugar más cálido.",
      silver: "¡Tu empatía brilla como un faro! Siempre pensando en los demás y ayudando con una sonrisa.",
      gold: "¡Tienes un alma de oro! Tu gran empatía y generosidad han construido puentes de arcoíris."
    },
    regulation: {
      bronze: "¡Qué gran calma! Respirar hondo y entender tus emociones nos ayuda a crecer juntos.",
      silver: "¡Encontraste tu equilibrio! Me encanta cómo gestionas las tormentas y traes de vuelta la luz del sol.",
      gold: "¡Un maestro de la paz! Tu calma y sabiduría emocional iluminan todo el Lago de la Calma."
    },
    connection: {
      bronze: "¡La constancia es tu superpoder! Seguir adelante día a día hace que tu mundo florezca.",
      silver: "¡Tu constancia es asombrosa! Cada hábito diario ha hecho crecer hermosos frutos en el valle.",
      gold: "¡Eres imparable! Tu increíble disciplina y perseverancia han transformado el Valle de los Hábitos."
    },
    courage: {
      bronze: "¡Eres muy valiente! Enfrentar nuevos retos hace que tu confianza crezca fuerte.",
      silver: "¡Qué gran valentía! Has escalado senderos difíciles y no te has rendido frente a los obstáculos.",
      gold: "¡Un verdadero héroe! Has conquistado las cumbres más altas de las Montañas del Esfuerzo."
    },
    curiosity: {
      bronze: "¡Tu imaginación vuela alto! Crear y aprender cosas nuevas hace que cada día sea divertido.",
      silver: "¡Qué mente tan brillante y curiosa! Siempre descubriendo nuevas ideas y soluciones únicas.",
      gold: "¡Un creador legendario! Has llenado nuestro armario de recuerdos mágicos con tu gran creatividad."
    }
  };

  return congrats[dimensionId]?.[tier] || "¡Muchas felicidades! Sigue adelante con esa gran energía. ✦";
}

export function BadgeCelebrationOverlay({ dimensionId, tier, parentNote, companionName, onClose }: BadgeCelebrationOverlayProps) {
  const [particles] = useState<Particle[]>(() => generateParticles(75));

  const playFanfareChime = useCallback(() => {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      
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
  }, []);

  useEffect(() => {
    playFanfareChime();
  }, [playFanfareChime]);

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
                  duration: p.duration,
                  ease: 'easeOut',
                  delay: p.delay,
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
                  duration: p.duration,
                  ease: 'easeOut',
                  delay: p.delay,
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
                  duration: p.duration,
                  ease: 'easeOut',
                  delay: p.delay,
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
              transition={{ delay: 0.55 }}
              className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl p-4.5 mb-4 shadow-soft text-left"
            >
              <p className="text-[9px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1 font-display">
                Mensaje de tus papás 💛
              </p>
              <p className="text-sm text-stone-700 dark:text-stone-200 italic font-medium font-body leading-relaxed">
                &quot;{parentNote}&quot;
              </p>
            </motion.div>
          )}

          {/* Companion congratulations speech bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65 }}
            className="flex items-center gap-3 bg-gradient-to-r from-bloom-50/55 to-amber-50/55 dark:from-stone-850 dark:to-stone-800 border border-bloom-100/40 dark:border-stone-800 rounded-2xl p-4.5 mb-6 text-left shadow-soft"
          >
            <div className="w-10 h-10 rounded-full bg-bloom-100 dark:bg-stone-700 flex items-center justify-center text-2xl flex-shrink-0 animate-bounce">
              ✨
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-bloom-600 dark:text-bloom-450 uppercase tracking-widest mb-1 font-display">
                ¡Tu compañero {companionName || 'Mira'} dice! 🌟
              </p>
              <p className="text-xs text-stone-750 dark:text-stone-300 font-medium font-body leading-relaxed">
                &quot;{getCompanionCongratulation(dimensionId, tier)}&quot;
              </p>
            </div>
          </motion.div>

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
