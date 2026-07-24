/**
 * MIRA — LocalLLMEngine
 * On-device offline companion response generator.
 * Provides neurodiversity-affirming grounding responses locally without requiring API keys or internet connection.
 */

export interface LocalLLMRequest {
  message: string;
  companionName?: string;
  childName?: string;
  stage?: string;
  worldName?: string;
}

const AFFIRMATIVE_TEMPLATES = [
  '¡Hola, {childName}! {companionName} te escucha con mucha atención. En el {worldName} siempre hay espacio para escucharte a tu propio ritmo. ✨',
  '¡Qué lindo saludarte, {childName}! Siento mucha calma cuando estamos juntos en el {worldName}. 🌸',
  'Gracias por compartir tus palabras con {companionName}, {childName}. Recuerda que cada paso que das es valioso. 🌟',
  '¡Hola! El aire del {worldName} susurra cosas hermosas hoy. ¿Cómo te gustaría continuar nuestro viaje? 🍃',
  '¡{companionName} está muy feliz de acompañarte, {childName}! Tu esfuerzo de hoy llena de luz nuestro espacio. 💫',
];

export class LocalLLMEngine {
  static generateResponse(req: LocalLLMRequest): string {
    const {
      message,
      companionName = 'Lumi',
      childName = 'Alex',
      worldName = 'Lago de la Calma',
    } = req;

    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('triste') || lowerMsg.includes('mal') || lowerMsg.includes('cansado')) {
      return `Está totalmente bien sentirse así a veces, ${childName}. ${companionName} está aquí contigo sin ninguna prisa. Respira suavemente. 💙`;
    }

    if (lowerMsg.includes('feliz') || lowerMsg.includes('bien') || lowerMsg.includes('alegre')) {
      return `¡Qué alegría tan grande, ${childName}! Me llena de luz verte tan contento en el ${worldName}. ¡Avanzamos juntos! 🎉`;
    }

    if (lowerMsg.includes('rutina') || lowerMsg.includes('tarea') || lowerMsg.includes('meta')) {
      return `¡Estás haciendo un trabajo sensacional, ${childName}! Cada pequeño logro cuenta y construye tu autonomía. 🌟`;
    }

    const template = AFFIRMATIVE_TEMPLATES[Math.floor(Math.random() * AFFIRMATIVE_TEMPLATES.length)]!;
    return template
      .replaceAll('{childName}', childName)
      .replaceAll('{companionName}', companionName)
      .replaceAll('{worldName}', worldName);
  }
}
