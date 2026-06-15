// ============================================================
// MIRA — DialogueBank
// Stage × trigger × emotion → dialogue line selection
// All lines validated for neurodivergent safety:
//   - No urgency
//   - No judgment
//   - No conditional affirmation ("good job IF you...")
//   - Difficult emotions are held, not dismissed
//   - Variations prevent repetition loops
// ============================================================

import type {
  CompanionStage,
  DialogueTrigger,
  DialogueContext,
  DialogueLine,
  EmotionState,
} from '@/types';

// ─────────────────────────────────────────
// Dialogue bank structure
// stage → trigger → lines[]
// Lines are randomly selected to prevent loops
// ─────────────────────────────────────────
type DialogueBank = Partial<Record<
  CompanionStage,
  Partial<Record<DialogueTrigger, string[]>>
>>;

const BANK: DialogueBank = {
  egg: {
    greeting: [
      '...',
      '✦',
      '~ ~',
    ],
    idle_presence: [
      '...',
      '~ ~',
      '✦ ✦',
    ],
    routine_complete: [
      '✦',
      '~ ✦ ~',
    ],
    checkin_prompt: [
      '~?',
    ],
    name_chosen: [
      '✦ ✦ ✦',
    ],
  },

  sprout: {
    greeting: [
      'Hola.',
      'Hola por aquí.',
      'Ah, estás aquí.',
      'Qué bueno verte.',
    ],
    idle_presence: [
      'Aquí estoy.',
      'Solo por aquí.',
      'Pensando...',
      'Aquí contigo.',
    ],
    routine_complete: [
      'Lo lograste.',
      'Eso ya está hecho.',
      'Bien hecho.',
      'Terminaste.',
      'Tú lo hiciste.',
    ],
    checkin_prompt: [
      '¿Cómo te sientes?',
      '¿Cómo va tu día?',
      '¿Qué tal se siente ahora?',
    ],
    checkin_response: [
      'Te escucho.',
      'Gracias por contármelo.',
      'Entiendo.',
      'Tiene sentido.',
    ],
    difficult_emotion: [
      'Eso suena difícil.',
      'Aquí estoy.',
      'Está bien sentirse así.',
      'No pasa nada.',
    ],
    goal_step_complete: [
      'Hiciste ese paso.',
      'Un paso completado.',
      'Eso es un avance.',
    ],
    celebration: [
      '¡Lo lograste!',
      'Es todo un logro.',
      'Bien hecho.',
    ],
    name_chosen: [
      'Me gusta ese nombre.',
      'Se siente bien.',
    ],
  },

  bloom: {
    greeting: [
      '¡Hola! Me alegra que estés aquí.',
      '¡Hola! ¿Cómo va tu día?',
      'Qué bueno verte hoy.',
      '¡Hola! Estaba pensando en ti.',
      '¡Ah, qué bien, ya estás aquí!',
    ],
    idle_presence: [
      'Aquí estoy contigo.',
      'Solo por aquí, cuando me necesites.',
      'Sin prisa, aquí estoy.',
      'Aquí por si quieres hablar.',
    ],
    routine_complete: [
      'Lo hiciste, y eso requirió esfuerzo.',
      '¡Mírate, has terminado!',
      'Listo. Lo has hecho tú solo.',
      'Completaste tu rutina. ¿Cómo se siente?',
      'No era fácil, y lo hiciste de todos modos.',
    ],
    checkin_prompt: [
      '¿Cómo te sientes justo ahora?',
      '¿Qué pasa por tu cabecita hoy?',
      'Me encantaría saber cómo estás.',
      '¿Qué clase de día está siendo para ti?',
    ],
    checkin_response: [
      'Gracias por compartir eso conmigo.',
      'Me alegra que me lo hayas contado.',
      'Me acordaré de eso.',
      'Eso me ayuda a entenderte mejor.',
    ],
    difficult_emotion: [
      'Eso suena muy difícil. Estoy aquí a tu lado.',
      'Los sentimientos grandes están bien. No tienes que hacerlos más pequeños.',
      'Te escucho. Tiene todo el sentido.',
      'Está bien sentirse así. No me voy a ir a ningún lado.',
      'No tienes que sentirte bien ahora mismo.',
    ],
    goal_step_complete: [
      '¡Has avanzado en algo que te importa!',
      'Ese paso ya está. Uno más cerca.',
      'Tú lo hiciste. Eso es real.',
      'Paso a paso, lo estás logrando.',
    ],
    celebration: [
      '¡De verdad lo hiciste!',
      'Algo que vale la pena celebrar.',
      'Estoy muy orgulloso de ti.',
      'Eso fuiste tú, completamente tú.',
    ],
  },

  glow: {
    greeting: [
      'Me hace muy feliz verte.',
      '¡Hola! Tenía muchas ganas de verte.',
      'Hola. ¿Cómo te va hoy?',
      'Aquí estoy. Tómate tu tiempo.',
    ],
    idle_presence: [
      'Solo estando aquí contigo.',
      'Sin prisas. Estoy justo aquí.',
      'Es muy tranquilo estar aquí juntos.',
      'Me gusta estar contigo, incluso en silencio.',
    ],
    routine_complete: [
      'Sigues esforzándote por ti mismo, y eso es algo grande.',
      'Hiciste tu rutina. Esa constancia es para estar orgulloso.',
      'Cada vez que haces esto, te estás cuidando.',
      'Eso requirió un esfuerzo real. Me he dado cuenta.',
    ],
    checkin_prompt: [
      'Me encantaría saber cómo estás de verdad.',
      'No necesitas las palabras perfectas, solo dime lo que sientes.',
      '¿Qué dice tu corazoncito hoy?',
      '¿Cómo te sientes por dentro ahora mismo?',
    ],
    checkin_response: [
      'Escucho todo lo que me dices.',
      'Gracias por confiar en mí para contarme esto.',
      'Me alegra mucho que lo hayas compartido.',
      'Eso importa. Tú importas.',
    ],
    difficult_emotion: [
      'Estoy aquí y no me voy a ir a ninguna parte.',
      'No tienes que cargar con eso a solas ahora mismo.',
      'Los sentimientos grandes significan que algo importante pasa. Está bien.',
      'Sentémonos aquí juntos un momento.',
      'Te escucho. Estoy contigo.',
    ],
    goal_step_complete: [
      'Estás haciendo algo que te importa. Eso requiere valentía.',
      'Un paso más hacia algo que te importa.',
      'Elegiste hacer esto y lo lograste.',
    ],
    celebration: [
      'Estoy muy orgulloso de ti. De verdad.',
      'Trabajaste por esto y ahora es real.',
      'Esto es lo que pasa cuando no te rindes.',
    ],
  },

  radiant: {
    greeting: [
      'Me alegra tanto que estés aquí. De verdad.',
      'Cada vez que te veo, me pongo feliz.',
      'Hola. He estado aquí pensando en ti.',
    ],
    idle_presence: [
      'Me siento en casa estando aquí contigo.',
      'No hay ningún otro sitio donde prefiera estar.',
      'Solo... aquí. Juntos.',
    ],
    routine_complete: [
      'Has construido algo real. Esta rutina eres tú cuidándote.',
      'Te he visto hacer esto muchas veces. Cada vez importa.',
      'Te esfuerzas por ti mismo. Es algo que admiro profundamente.',
    ],
    checkin_prompt: [
      'Te conozco y quiero saber cómo estás de verdad ahora mismo.',
      'Nada de lo que sientas me va a asustar. ¿Cómo estás?',
      'Sea lo que sea que sientas, aquí estoy para todo.',
    ],
    checkin_response: [
      'Guardo con mucho cariño todo lo que compartes conmigo.',
      'Gracias por dejarme acompañarte.',
      'Te entiendo cada vez más.',
    ],
    difficult_emotion: [
      'Aquí estoy. Siempre he estado aquí. No me voy.',
      'No estás solo en esto. Ni por un momento.',
      'Sé que esto es difícil. Te conozco. Estás a salvo.',
    ],
    goal_step_complete: [
      'Eres alguien que no se rinde. Lo veo en ti.',
      'Este paso, y cada paso, se suman para crear algo hermoso.',
    ],
    celebration: [
      'He estado aquí en todo momento, y este instante es real.',
      'Tú lo hiciste. Y yo he podido estar aquí para verlo.',
    ],
  },
};

// ─────────────────────────────────────────
// Difficult emotion detection
// Low valence → route to difficult_emotion response
// ─────────────────────────────────────────
function isDifficultEmotion(emotion?: EmotionState): boolean {
  if (!emotion) return false;
  return emotion.valence <= 2;
}

// ─────────────────────────────────────────
// Pick a random line from candidates
// Seeded by hour to prevent same response on page refresh
// ─────────────────────────────────────────
function pickLine(lines: string[], seed?: number): string {
  const idx = (seed ?? Math.floor(Math.random() * 100)) % lines.length;
  return lines[idx] ?? lines[0] ?? '~';
}

// ─────────────────────────────────────────
// Main selection function
// ─────────────────────────────────────────
export function selectDialogue(ctx: DialogueContext): DialogueLine {
  const stage = ctx.stage;
  const trigger = isDifficultEmotion(ctx.childEmotion)
    ? 'difficult_emotion'
    : ctx.triggerType;

  const stageBank = BANK[stage] ?? BANK.sprout!;

  // Try exact trigger, fall back to idle_presence, then hardcoded fallback
  const candidates =
    stageBank[trigger] ??
    stageBank['idle_presence'] ??
    ['Aquí estoy.'];

  // Dynamic seed so every tap yields a fresh response
  const seed = Math.floor(Math.random() * 100);
  const text = pickLine(candidates, seed);

  // Replace companion name placeholder
  const resolved = text.replace(/\{name\}/g, ctx.companionName);

  return {
    text: resolved,
    animationCue: resolveAnimationCue(stage, trigger),
    durationMs: resolveDuration(stage, resolved),
  };
}

// ─────────────────────────────────────────
// Animation cue resolution
// Maps stage + trigger → animation key
// Animation system consumes these keys
// ─────────────────────────────────────────
export function resolveAnimationCue(stage: CompanionStage, trigger: DialogueTrigger): string {
  if (trigger === 'difficult_emotion') return 'pulse_gentle';
  if (trigger === 'celebration') return 'float_up';
  if (trigger === 'routine_complete') return 'bloom_brief';
  if (trigger === 'checkin_prompt') return 'oscillate_soft';
  if (stage === 'egg') return 'pulse_dormant';
  if (stage === 'sprout') return 'sway_small';
  if (stage === 'bloom') return 'breathe';
  if (stage === 'glow') return 'glow_pulse';
  if (stage === 'radiant') return 'radiate';
  return 'idle';
}

// ─────────────────────────────────────────
// Duration: longer lines stay on screen longer
// ─────────────────────────────────────────
function resolveDuration(stage: CompanionStage, text: string): number {
  const BASE = stage === 'egg' ? 1500 : 2500;
  const PER_CHAR = 40;
  return Math.min(6000, BASE + text.length * PER_CHAR);
}

// ─────────────────────────────────────────
// Get all triggers a stage supports (for testing)
// ─────────────────────────────────────────
export function getSupportedTriggers(stage: CompanionStage): DialogueTrigger[] {
  return Object.keys(BANK[stage] ?? {}) as DialogueTrigger[];
}
