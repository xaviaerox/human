/**
 * GentleNotifier — Gentle, Non-Punitive Notification System for MIRA.
 * Designed to provide positive reinforcement and transition support without urgency or anxiety.
 */

export interface NotificationPrompt {
  id: string;
  title: string;
  body: string;
  category: 'routine' | 'emotional' | 'companion' | 'celebration';
  icon?: string;
}

const GENTLE_PROMPTS: Record<string, NotificationPrompt[]> = {
  routine: [
    { id: 'r1', title: 'Momento de Rutina 🌸', body: 'Cuando te apetezca, puedes revisar tus pasos de hoy.', category: 'routine', icon: '✨' },
    { id: 'r2', title: 'Un pequeño paso 🌿', body: 'Tu rutina está lista esperándote a tu propio ritmo.', category: 'routine', icon: '🌱' },
  ],
  emotional: [
    { id: 'e1', title: '¿Cómo te sientes? 💖', body: 'Tu compañero está aquí para escucharte si quieres compartir tu momento.', category: 'emotional', icon: '💬' },
    { id: 'e2', title: 'Espacio de Calma 🌊', body: 'Si necesitas respirar o tomar una pausa, el lago está tranquilo.', category: 'emotional', icon: '🕊️' },
  ],
  companion: [
    { id: 'c1', title: '¡Hola amigo! 🐾', body: 'Tu compañero se alegra de acompañarte hoy.', category: 'companion', icon: '🦊' },
  ],
  celebration: [
    { id: 'w1', title: '¡Estrella conseguida! ⭐', body: 'Has mostrado mucha constancia. ¡Buen trabajo!', category: 'celebration', icon: '🌟' },
  ],
};

export function getGentlePrompt(category: 'routine' | 'emotional' | 'companion' | 'celebration'): NotificationPrompt {
  const prompts = GENTLE_PROMPTS[category] || GENTLE_PROMPTS.routine!;
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex]!;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function sendGentleNotification(prompt: NotificationPrompt): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') {
    new Notification(prompt.title, {
      body: prompt.body,
      icon: '/favicon.ico',
      silent: true,
    });
    return true;
  }
  return false;
}
