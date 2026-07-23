/**
 * StoryGenerator — Therapeutic AI Bedtime Micro-Story Engine for MIRA
 * Compiles child achievements, emotional check-ins, and value progress into a soothing 3-chapter bedtime story.
 */

export interface StoryChapter {
  chapterNumber: number;
  title: string;
  content: string;
  illustrationHint: string;
}

export interface MicroStory {
  id: string;
  title: string;
  moral: string;
  chapters: StoryChapter[];
  createdAt: string;
}

export interface GenerateStoryOptions {
  childName: string;
  companionName?: string;
  worldName?: string;
  recentEmotion?: string;
  valueDimensionLabel?: string;
}

/**
 * Generates a therapeutic, non-punitive bedtime story centered on emotional growth and warmth.
 */
export function generateMicroStory(options: GenerateStoryOptions): MicroStory {
  const child = options.childName || 'Alex';
  const companion = options.companionName || 'Lumi';
  const world = options.worldName || 'Lago de la Calma';
  const emotion = options.recentEmotion || 'tranquilo';
  const dimension = options.valueDimensionLabel || 'Constancia';

  const storyId = `story_${Date.now()}`;
  const title = `El secreto del ${world}`;
  const moral = `Cada pequeño paso de ${child} hace florecer el mundo con paciencia y amor.`;

  const chapters: StoryChapter[] = [
    {
      chapterNumber: 1,
      title: 'Capítulo 1: El Atardecer Dorado',
      content: `El sol comenzaba a esconderse tras las colinas del ${world}. ${child} caminaba despacio sintiéndose ${emotion}. A su lado, ${companion} brillaba con una luz dorada y suave que iluminaba el camino sin prisas.`,
      illustrationHint: 'atardecer_dorado'
    },
    {
      chapterNumber: 2,
      title: 'Capítulo 2: El Descubrimiento de la Semilla',
      content: `Cerca de un arroyo sereno, encontraron una pequeña semilla que guardaba el poder de la ${dimension}. "${child}", susurró ${companion}, "cada vez que realizas tus rutinas y escuchas a tu corazón, esta semilla crece un poquito más". ${child} sonrió y la regó con agua cristalina.`,
      illustrationHint: 'semilla_magica'
    },
    {
      chapterNumber: 3,
      title: 'Capítulo 3: Un Sueño Lleno de Estrellas',
      content: `Al caer la noche, la semilla floreció en un brote resplandeciente. ${companion} se acurrucó cerca de ${child} para descansar. "Mañana será un nuevo día para explorar juntos a tu propio ritmo. Que tengas dulces sueños."`,
      illustrationHint: 'noche_estrellada'
    }
  ];

  return {
    id: storyId,
    title,
    moral,
    chapters,
    createdAt: new Date().toISOString()
  };
}
