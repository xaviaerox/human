import type { ValueDimensionId, TimeOfDay } from '@/types';

export interface RoutineTemplate {
  id: string;
  title: string;
  description: string;
  category: 'adhd' | 'sensory' | 'school' | 'calm';
  time_of_day: TimeOfDay;
  spark_value: number;
  value_dimensions: ValueDimensionId[];
  color_token: string;
  icon_key: string;
  steps: {
    title: string;
    duration_minutes: number;
    description?: string;
  }[];
}

export const NEURODIVERGENT_ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'template-adhd-morning',
    title: 'Mañana Sin Prisa (TDAH Friendly)',
    description: 'Paso a paso estructurado con tiempos claros para evitar agobios matutinos.',
    category: 'adhd',
    time_of_day: 'morning',
    spark_value: 3,
    value_dimensions: ['autonomy', 'regulation'],
    color_token: 'morning',
    icon_key: 'sun',
    steps: [
      { title: 'Estiramiento suave en la cama', duration_minutes: 3, description: 'Despertar el cuerpo poco a poco' },
      { title: 'Lavar cara y cepillar dientes', duration_minutes: 5, description: 'Agua fresca para activar el día' },
      { title: 'Vestirme con la ropa elegida ayer', duration_minutes: 5 },
      { title: 'Desayunar con calma', duration_minutes: 15 },
    ],
  },
  {
    id: 'template-sensory-bedtime',
    title: 'Desconexión Nocturna Sensory-Friendly',
    description: 'Bajar la sobreestimulación táctil y auditiva antes de dormir.',
    category: 'sensory',
    time_of_day: 'evening',
    spark_value: 4,
    value_dimensions: ['regulation', 'connection'],
    color_token: 'evening',
    icon_key: 'moon',
    steps: [
      { title: 'Luz tenue y guardar pantallas', duration_minutes: 5 },
      { title: 'Pijama cómodo y cepillado suave', duration_minutes: 7 },
      { title: 'Lectura o cuento de audio relajante', duration_minutes: 15 },
      { title: '3 respiraciones profundas con el companion', duration_minutes: 2 },
    ],
  },
  {
    id: 'template-school-prep',
    title: 'Preparar Mochila y Salida a Clase',
    description: 'Checklist visual para salir de casa sin olvidar nada importante.',
    category: 'school',
    time_of_day: 'evening',
    spark_value: 3,
    value_dimensions: ['autonomy', 'courage'],
    color_token: 'afternoon',
    icon_key: 'backpack',
    steps: [
      { title: 'Revisar mochila con el checklist', duration_minutes: 5 },
      { title: 'Ponerse zapatos y abrigo', duration_minutes: 4 },
      { title: 'Abrazo de despedida y saludo al companion', duration_minutes: 1 },
    ],
  },
  {
    id: 'template-calm-pause',
    title: 'Pausa de Regulación y Desescalada',
    description: 'Rutina breve para recuperar el control durante momentos de agobio.',
    category: 'calm',
    time_of_day: 'anytime',
    spark_value: 2,
    value_dimensions: ['regulation', 'empathy'],
    color_token: 'calm',
    icon_key: 'heart',
    steps: [
      { title: 'Beber un vaso de agua fresca', duration_minutes: 2 },
      { title: '5 respiraciones de calma', duration_minutes: 3 },
      { title: 'Anotar mi emoción en MIRA', duration_minutes: 2 },
    ],
  },
];
