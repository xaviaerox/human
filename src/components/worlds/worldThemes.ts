import type { ValueDimensionId } from '@/types';

export interface WorldTheme {
  id: string;
  name: string;
  dimension: ValueDimensionId;
  bgGradient: string;
  textColor: string;
  accentBg: string;
  emoji: string;
  description: string;
}

export const WORLD_THEMES: WorldTheme[] = [
  {
    id: 'lago_calma',
    name: 'Lago de la Calma',
    dimension: 'regulation',
    bgGradient: 'from-sky-100 via-sky-50 to-blue-200 dark:from-sky-950 dark:via-sky-900 dark:to-indigo-950',
    textColor: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-100 border-sky-200 dark:bg-sky-900/50 dark:border-sky-850',
    emoji: '☯',
    description: 'Aprende a regular tus emociones y respirar hondo.',
  },
  {
    id: 'valle_habitos',
    name: 'Valle de los Hábitos',
    dimension: 'connection', // Constancia
    bgGradient: 'from-emerald-100 via-green-50 to-teal-200 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950',
    textColor: 'text-moss-700 dark:text-moss-300',
    accentBg: 'bg-moss-100 border-moss-200 dark:bg-moss-900/50 dark:border-moss-850',
    emoji: '♾',
    description: 'La constancia en tus rutinas hace que este valle florezca.',
  },
  {
    id: 'bosque_autonomia',
    name: 'Bosque de la Autonomía',
    dimension: 'autonomy',
    bgGradient: 'from-green-100 via-emerald-50 to-emerald-300 dark:from-green-950 dark:via-emerald-950 dark:to-emerald-900',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-850',
    emoji: '↟',
    description: 'Haz las cosas por ti mismo y ayuda a crecer a los árboles.',
  },
  {
    id: 'montana_esfuerzo',
    name: 'Montañas del Esfuerzo',
    dimension: 'courage', // Valentía
    bgGradient: 'from-amber-100 via-orange-50 to-rose-200 dark:from-amber-950 dark:via-orange-950 dark:to-rose-950',
    textColor: 'text-bloom-700 dark:text-bloom-300',
    accentBg: 'bg-bloom-100 border-bloom-200 dark:bg-bloom-900/50 dark:border-bloom-850',
    emoji: '▲',
    description: 'Supera tus miedos y sube las cumbres del esfuerzo.',
  },
  {
    id: 'reino_social',
    name: 'Reino de la Vida Social',
    dimension: 'empathy',
    bgGradient: 'from-purple-100 via-pink-50 to-fuchsia-200 dark:from-purple-950 dark:via-pink-950 dark:to-fuchsia-950',
    textColor: 'text-lavender-700 dark:text-lavender-300',
    accentBg: 'bg-lavender-100 border-lavender-200 dark:bg-lavender-900/50 dark:border-lavender-850',
    emoji: '♡',
    description: 'Comparte con otros, empatiza y haz amigos.',
  },
];

export function getWorldPhase(score: number): { phase: 'seed' | 'sprout' | 'bloom'; label: string; icon: string } {
  if (score >= 100) return { phase: 'bloom', label: 'Esplendor', icon: '✿' };
  if (score >= 31) return { phase: 'sprout', label: 'Brote', icon: '✣' };
  return { phase: 'seed', label: 'Semilla', icon: '○' };
}

export function getWorldProgress(score: number): { percent: number; nextLabel: string } {
  if (score >= 100) {
    return { percent: 100, nextLabel: 'Esplendor máximo' };
  }
  if (score >= 31) {
    const percent = Math.round(((score - 31) / 69) * 100);
    return { percent, nextLabel: 'para Esplendor' };
  }
  const percent = Math.round((score / 30) * 100);
  return { percent, nextLabel: 'para Brote' };
}
