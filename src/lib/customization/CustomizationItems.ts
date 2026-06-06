export interface CustomizationItem {
  id: string;
  name: string;
  type: 'accessory' | 'theme';
  target: 'avatar' | 'companion' | 'both';
  cost: number;
  emoji: string;
  value: string;
  description: string;
}

export const CUSTOMIZATION_ITEMS: CustomizationItem[] = [
  // ACCESSORIES
  {
    id: 'acc_crown',
    name: 'Corona Real',
    type: 'accessory',
    target: 'both',
    cost: 20,
    emoji: '👑',
    value: '👑',
    description: '¡Siéntete como un rey o reina!'
  },
  {
    id: 'acc_sunglasses',
    name: 'Gafas de Sol',
    type: 'accessory',
    target: 'both',
    cost: 10,
    emoji: '🕶️',
    value: '🕶️',
    description: 'Para lucir increíblemente guay.'
  },
  {
    id: 'acc_top_hat',
    name: 'Sombrero de Copa',
    type: 'accessory',
    target: 'both',
    cost: 15,
    emoji: '🎩',
    value: '🎩',
    description: 'Elegancia clásica para toda ocasión.'
  },
  {
    id: 'acc_ribbon',
    name: 'Lazo Coqueto',
    type: 'accessory',
    target: 'both',
    cost: 8,
    emoji: '🎀',
    value: '🎀',
    description: 'Un detalle bonito y colorido.'
  },
  {
    id: 'acc_headphones',
    name: 'Auriculares',
    type: 'accessory',
    target: 'both',
    cost: 12,
    emoji: '🎧',
    value: '🎧',
    description: '¡Listos para escuchar la mejor música!'
  },
  {
    id: 'acc_grad_cap',
    name: 'Gorro de Graduado',
    type: 'accessory',
    target: 'both',
    cost: 12,
    emoji: '🎓',
    value: '🎓',
    description: 'Por aprender algo nuevo cada día.'
  },

  // COMPANION COLOR THEMES
  {
    id: 'theme_cosmic',
    name: 'Piel Cósmica',
    type: 'theme',
    target: 'companion',
    cost: 15,
    emoji: '🌌',
    value: 'cosmic',
    description: 'Una piel de estrellas y galaxias violetas.'
  },
  {
    id: 'theme_emerald',
    name: 'Piel Esmeralda',
    type: 'theme',
    target: 'companion',
    cost: 15,
    emoji: '🌲',
    value: 'emerald',
    description: 'Un tono verde bosque lleno de vida.'
  },
  {
    id: 'theme_sunset',
    name: 'Piel Atardecer',
    type: 'theme',
    target: 'companion',
    cost: 15,
    emoji: '🌅',
    value: 'sunset',
    description: 'El calor de un atardecer naranja y rojo.'
  },
  {
    id: 'theme_bubblegum',
    name: 'Piel Rosa Chicle',
    type: 'theme',
    target: 'companion',
    cost: 15,
    emoji: '🍬',
    value: 'bubblegum',
    description: 'Dulce, alegre y muy brillante.'
  }
];

export const COMPANION_THEME_COLORS: Record<string, { fill: string; glow: string; secondary: string }> = {
  cosmic:    { fill: '#6d28d9', glow: '#a78bfa', secondary: '#4c1d95' }, // deep purple
  emerald:   { fill: '#047857', glow: '#6ee7b7', secondary: '#064e3b' }, // emerald green
  sunset:    { fill: '#ea580c', glow: '#fdba74', secondary: '#7c2d12' }, // orange-red
  bubblegum: { fill: '#db2777', glow: '#fbcfe8', secondary: '#831843' }  // hot pink
};
