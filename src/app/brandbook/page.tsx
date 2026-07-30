'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Heart,
  Brain,
  Volume2,
  Layers,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Compass,
  Play,
  Pause,
  Sliders,
  CheckCircle,
  Check,
  Palette,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MirateaLogo, SolutechLogo, XaviProfileCard } from '@/components/ui/BrandLogos';

// --- COLOR PALETTE DEFINITION ---
interface ColorToken {
  name: string;
  role: string;
  hex: string;
  rgb: string;
  tailwind: string;
  useCase: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  previewContainerBg?: string;
  textColorPreview?: string;
}

const COLOR_TOKENS: ColorToken[] = [
  {
    name: 'Deep Slate',
    role: 'Color Principal Corporativo',
    hex: '#1B3A52',
    rgb: 'rgb(27, 58, 82)',
    tailwind: 'bg-sky-900',
    useCase: 'Estructura, autoridad, headers, barras de navegación y firmeza institucional.',
    bgClass: 'bg-[#1B3A52]',
    textClass: 'text-[#1B3A52]',
    borderClass: 'border-[#1B3A52]'
  },
  {
    name: 'Sky Accent',
    role: 'Secundario Primario',
    hex: '#3081AB',
    rgb: 'rgb(48, 129, 171)',
    tailwind: 'bg-sky-500',
    useCase: 'Interacciones primarias, enlaces activos, foco visual y claridad tecnológica.',
    bgClass: 'bg-[#3081AB]',
    textClass: 'text-[#3081AB]',
    borderClass: 'border-[#3081AB]'
  },
  {
    name: 'Warm Bloom',
    role: 'Color de Celebración',
    hex: '#DF6B28',
    rgb: 'rgb(223, 107, 40)',
    tailwind: 'bg-bloom-500',
    useCase: 'Chispas de avance, refuerzo positivo, botones principales y energía humana.',
    bgClass: 'bg-[#DF6B28]',
    textClass: 'text-[#DF6B28]',
    borderClass: 'border-[#DF6B28]'
  },
  {
    name: 'Tranquil Moss',
    role: 'Color de Equilibrio',
    hex: '#748B52',
    rgb: 'rgb(116, 139, 82)',
    tailwind: 'bg-moss-500',
    useCase: 'Progreso constante, autorregulación, bienestar y validación serena.',
    bgClass: 'bg-[#748B52]',
    textClass: 'text-[#748B52]',
    borderClass: 'border-[#748B52]'
  },
  {
    name: 'Gentle Lavender',
    role: 'Color Sensorial Calma',
    hex: '#8E6DBC',
    rgb: 'rgb(142, 109, 188)',
    tailwind: 'bg-lavender-500',
    useCase: 'Rincón de respiración, introspección, contención emocional y armonía.',
    bgClass: 'bg-[#8E6DBC]',
    textClass: 'text-[#8E6DBC]',
    borderClass: 'border-[#8E6DBC]'
  },
  {
    name: 'Soft Stone',
    role: 'Neutro de Descanso Visual',
    hex: '#FAF9F7',
    rgb: 'rgb(250, 249, 247)',
    tailwind: 'bg-stone-50',
    useCase: 'Lienzo sordo, fondos acolchados, descanso de la mirada y contraste suave.',
    bgClass: 'bg-[#FAF9F7]',
    textClass: 'text-stone-800',
    borderClass: 'border-stone-400',
    previewContainerBg: 'bg-[#1E293B] p-4 rounded-t-3xl', // Fondo oscuro contrastante para visibilidad clara
    textColorPreview: 'text-[#FAF9F7]'
  }
];

// --- MODULES DEFINITION ---
interface ModuleItem {
  id: string;
  name: string;
  badge: string;
  description: string;
  targetUser: string;
  keyFeatures: string[];
  status: string;
  colorTheme: string;
}

const MIRATEA_MODULES: ModuleItem[] = [
  {
    id: 'family',
    name: 'MIRATEA Family',
    badge: 'Hogar & Cuidadores',
    description: 'Espacio dedicado para familias. Centraliza agendas visuales de rutinas, check-ins emocionales y registro de micro-logros sin presión.',
    targetUser: 'Madres, padres, tutores y cuidadores directos.',
    keyFeatures: ['Agendas visuales amables', 'Respiración guiada 1-clic', 'Multi-hijo con PIN parental', 'Exportación de históricos familiares'],
    status: 'Producción v1.0',
    colorTheme: 'from-amber-500/10 to-orange-500/10 border-orange-200 text-orange-800'
  },
  {
    id: 'professional',
    name: 'MIRATEA Professional',
    badge: 'Clínica & Gabinetes',
    description: 'Panel para terapeutas ocupacionales, psicólogos y logopedas. Permite dar seguimiento cuantitativo al progreso del hogar.',
    targetUser: 'Terapeutas, psicólogos/as, orientadores y centros de atención temprana.',
    keyFeatures: ['Generación de Informes PDF/CSV', 'Métricas de 6 dimensiones emocionales', 'Sin burocracia de registro', 'Integración de planes de intervención'],
    status: 'Producción v1.0',
    colorTheme: 'from-sky-500/10 to-indigo-500/10 border-sky-200 text-sky-800'
  },
  {
    id: 'admin',
    name: 'MIRATEA Admin',
    badge: 'Gobernanza & Privacidad',
    description: 'Gestión de accesos, permisos multi-rol y control estricto de gobernanza de datos para instituciones y asociaciones.',
    targetUser: 'Directores de centros, administradores de red y asociaciones TEA.',
    keyFeatures: ['Cumplimiento GDPR Art. 20', 'Seguridad con PIN de 4 dígitos', 'Gestión de roles y consentimiento', 'Sin rastreadores ni terceros'],
    status: 'Producción v1.0',
    colorTheme: 'from-purple-500/10 to-violet-500/10 border-purple-200 text-purple-800'
  },
  {
    id: 'analytics',
    name: 'MIRATEA Analytics',
    badge: 'Análisis de Evolución',
    description: 'Visualización de tendencias emocionales (Ánimo, Energía, Enfoque, Calma, Conexión, Valentía) mediante gráficos claros.',
    targetUser: 'Familias y profesionales clínicos.',
    keyFeatures: ['Gráficos sin juicios de valor', 'Detección visual de factores de sobrecarga', 'Históricos longitudinales', 'Exportación de datos brutos JSON'],
    status: 'Producción v1.0',
    colorTheme: 'from-emerald-500/10 to-teal-500/10 border-teal-200 text-teal-800'
  },
  {
    id: 'ai',
    name: 'MIRATEA AI',
    badge: 'Inteligencia Ética Local',
    description: 'Motor inteligente adaptativo para descomponer objetivos grandes en micropasos alcanzables e historias de calma.',
    targetUser: 'Uso transversal en la plataforma.',
    keyFeatures: ['Sanitizador PII automático', 'Modo 100% Offline (WASM/WebLLM)', 'Generador de micropasos MicrotaskEngine', 'Cuentos de regulación empáticos'],
    status: 'Producción v1.0',
    colorTheme: 'from-blue-500/10 to-cyan-500/10 border-cyan-200 text-cyan-800'
  }
];

// --- DO / DON'T ITEMS ---
interface PrincipleRule {
  title: string;
  allowed: string;
  prohibited: string;
  rationale: string;
}

const PRINCIPLE_RULES: PrincipleRule[] = [
  {
    title: 'Contadores y Rachas (Streaks)',
    allowed: 'Refuerzo acumulativo de chispas de valentía (cada paso suma y permanece).',
    prohibited: 'Rachas de días consecutivos ("¡Llevas 5 días, no pierdas la racha!").',
    rationale: 'Las rachas rotas causan espirales de culpa, vergüenza y abandono catastrófico en personas neurodivergentes.'
  },
  {
    title: 'Compañero Digital (Lumi)',
    allowed: 'Lumi evoluciona con interacciones positivas y mantiene su nivel inmutable.',
    prohibited: 'Involución de fase o mensajes de chantaje emocional ("¡Te echo de menos! Lumi está triste").',
    rationale: 'Punir la ausencia mediante degradación visual o culpa es una práctica oscura y estresante.'
  },
  {
    title: 'Mecánicas de Presión Temporal',
    allowed: 'Respiración guiada a ritmo natural sin cronómetros regresivos angustiantes.',
    prohibited: 'Contadores regresivos con alarmas o efectos de urgencia.',
    rationale: 'La presión del tiempo incrementa los niveles de cortisol y desencadena sobrecarga sensorial.'
  },
  {
    title: 'Comparación Social',
    allowed: 'Progreso individual único celebrado en privado dentro del entorno familiar.',
    prohibited: 'Tablas de clasificación, ránquines de niños o insignias comparativas.',
    rationale: 'La competencia destruye la motivación intrínseca y promueve la insatisfacción.'
  }
];

export default function BrandbookPage() {
  const [activeSection, setActiveSection] = useState<string>('resumen');
  const [selectedModule, setSelectedModule] = useState<string>('family');
  const [toneTab, setToneTab] = useState<'miratea' | 'forbidden'>('miratea');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Interactive Box Breathing Simulator
  const [isBreathingRunning, setIsBreathingRunning] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<'Inhala' | 'Mantén' | 'Exhala' | 'Descansa'>('Inhala');
  const [breathProgress, setBreathProgress] = useState<number>(0);

  // Quiet Hex Copy Toast Helper
  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  // Box breathing effect simulator
  useEffect(() => {
    if (!isBreathingRunning) return;
    const interval = setInterval(() => {
      setBreathProgress((prev) => {
        if (prev >= 100) {
          setBreathPhase((currentPhase) => {
            if (currentPhase === 'Inhala') return 'Mantén';
            if (currentPhase === 'Mantén') return 'Exhala';
            if (currentPhase === 'Exhala') return 'Descansa';
            return 'Inhala';
          });
          return 0;
        }
        return prev + 5;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isBreathingRunning]);

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-stone-800 font-body selection:bg-bloom-100 selection:text-bloom-900 pb-20">
      {/* STICKY TOP HEADER */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MirateaLogo size="sm" showSubtitle={false} />
          </div>

          <nav className="hidden lg:flex items-center space-x-1 text-xs font-medium text-stone-600">
            {[
              { id: 'resumen', label: 'Resumen' },
              { id: 'identidad-visual', label: 'Identidad Visual & Logos' },
              { id: 'esencia', label: 'Esencia' },
              { id: 'arquitectura', label: 'Arquitectura' },
              { id: 'colores', label: 'Paleta' },
              { id: 'identidad-verbal', label: 'Voz & Tono' },
              { id: 'modulos', label: 'Módulos' },
              { id: 'calma-demo', label: 'Rincón Calma' },
              { id: 'dossier', label: 'Claims & Pitches' },
              { id: 'principios', label: 'Do / Don\'t' }
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeSection === item.id
                    ? 'bg-stone-100 text-[#1B3A52] font-semibold'
                    : 'hover:text-stone-900 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1B3A52] to-[#162f43] text-white pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium backdrop-blur-sm mb-6 text-sky-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Guía de Marca & Manual de Estilo Definitivo</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white mb-4 leading-tight"
          >
            Solutech <span className="text-bloom-400">·</span> MIRATEA
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-stone-200 max-w-3xl mx-auto font-light leading-relaxed mb-8"
          >
            Tecnología útil, calmada y segura diseñada bajo principios <strong className="text-sky-300 font-semibold">Neurodiversity-First</strong> para acompañar a personas en el espectro TEA, sus familias y profesionales.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 text-xs"
          >
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-300" />
              <span>Compañía Matriz: <strong>Solutech</strong></span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-bloom-300" />
              <span>Solución Principal: <strong>MIRATEA</strong></span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 space-y-20">

        {/* SECTION 1: RESUMEN EJECUTIVO */}
        <section id="resumen" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">1. Resumen Ejecutivo & Contexto Real</h2>
              <p className="text-sm text-stone-500">Consolidación de la plataforma MIRA hacia el ecosistema MIRATEA by Solutech.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft">
              <span className="text-xs font-mono font-bold text-stone-400 uppercase tracking-wider block mb-2">01 / Compañía Matriz</span>
              <h3 className="text-lg font-bold text-[#1B3A52] mb-2">Solutech</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Marca corporativa de desarrollo de software que aporta solvencia técnica, visión tecnológica, arquitectura escalable y rigor en la gestión de datos.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-bloom-200 shadow-soft relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-bloom-100/50 rounded-full blur-xl" />
              <span className="text-xs font-mono font-bold text-bloom-600 uppercase tracking-wider block mb-2">02 / Producto Ecosistema</span>
              <h3 className="text-lg font-bold text-bloom-800 mb-2">MIRATEA</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Plataforma digital especializada en entornos TEA para centralizar la autorregulación emocional, la autonomía diaria y la comunicación fluida entre familias y gabinetes.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: IDENTIDAD VISUAL & LOGOS REALES */}
        <section id="identidad-visual" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-bloom-100 text-bloom-800">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">2. Identidad Visual & Marcas Gráficas</h2>
              <p className="text-sm text-stone-500">Logotipos oficiales de MIRATEA, Solutech y perfil del creador.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Único MIRATEA */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-bloom-600 uppercase tracking-wider block mb-3">Marca Oficial MIRATEA</span>
                <div className="p-8 rounded-2xl bg-[#FAF9F7] border border-stone-200 flex items-center justify-center min-h-[140px]">
                  <MirateaLogo size="lg" />
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                <strong>Icono Canónico Oficial:</strong> La estrella <em>Beacon Star</em> de 4 rayos curvos con aureola dorada sobre azulejo Teal de calma sensorial, acompañada del descriptor <em>by Solutech</em>.
              </p>
            </div>

            {/* Logo Real Solutech */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider block mb-3">Marca Corporativa Solutech</span>
                <div className="p-8 rounded-2xl bg-[#FAF9F7] border border-stone-200 flex items-center justify-center min-h-[140px]">
                  <SolutechLogo size="lg" />
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Escudo de protección IT naranja real de Solutech con trazados de circuitos y la letra S estilizada.
              </p>
            </div>

            {/* Perfil Real de Xavi Alonso */}
            <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-soft space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider block mb-3">Ingeniería & Desarrollo</span>
                <div className="p-8 rounded-2xl bg-[#FAF9F7] border border-stone-200 flex items-center justify-center min-h-[140px]">
                  <XaviProfileCard size="lg" />
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Fotografía e identidad del fundador e ingeniero principal responsable del desarrollo de la arquitectura de la plataforma.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: ESENCIA DE MARCA */}
        <section id="esencia" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">3. Esencia de Marca & Valores</h2>
              <p className="text-sm text-stone-500">Propósito, Misión y los 7 valores inquebrantables de desarrollo.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-stone-100">
              <div>
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Propósito Fundamental</h3>
                <p className="text-xl font-display font-medium text-[#1B3A52] leading-relaxed">
                  "Desarrollar tecnología útil y amable que mejore la coordinación, la autorregulación y la calidad de vida de las personas con TEA, sus familias y profesionales."
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">Misión Estratégica</h3>
                <p className="text-base text-stone-600 leading-relaxed">
                  Crear soluciones digitales sobrias, seguras y libres de juicios de valor que reduzcan la carga mental de las familias, descompongan metas complejas en micropasos amables y protejan la privacidad del menor en todo momento.
                </p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">Los 7 Valores Neurodiversity-First</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Empatía Respetuosa', desc: 'Comprensión real sin condescendencia ni infantilización.' },
                { title: 'Utilidad Directa', desc: 'Cada pantalla resuelve un problema sin fricciones vacías.' },
                { title: 'Calma Sensorial', desc: 'Diseño sobrio, sin estímulos bruscos ni contadores estresantes.' },
                { title: 'Confianza y Seguridad', desc: 'Portabilidad GDPR Art. 20 y procesamiento local sin sorpresas.' },
                { title: 'Refuerzo Puro', desc: 'Cero penalizaciones, el esfuerzo siempre suma y jamás se resta.' },
                { title: 'Continuidad', desc: 'Vínculo permanente entre el hogar, terapeutas y centros.' },
                { title: 'Respeto Adulto', desc: 'Comunicación clara, precisa y directa con las familias.' }
              ].map((val, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-moss-600" />
                    <h4 className="font-bold text-sm text-[#1B3A52]">{val.title}</h4>
                  </div>
                  <p className="text-xs text-stone-500">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4: ARQUITECTURA DE MARCA */}
        <section id="arquitectura" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">4. Arquitectura de Marca & Reglas de Firma</h2>
              <p className="text-sm text-stone-500">Jerarquía corporativa y co-branding institucional.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-card">
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between mb-8">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="p-5 rounded-2xl bg-[#1B3A52] text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-sky-300 font-mono">Compañía Matriz</span>
                    <h4 className="text-xl font-bold font-display">Solutech</h4>
                  </div>
                  <Building2 className="w-6 h-6 text-sky-300" />
                </div>
                <div className="ml-6 pl-6 border-l-2 border-dashed border-stone-300 space-y-3">
                  <div className="p-4 rounded-2xl bg-bloom-50 border border-bloom-200 text-bloom-900 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-bloom-600 font-mono">Producto Ecosistema</span>
                      <h5 className="text-lg font-bold font-display">MIRATEA</h5>
                    </div>
                    <Sparkles className="w-5 h-5 text-bloom-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="p-2 rounded-lg bg-stone-100 text-stone-700 font-mono text-center">MIRATEA Family</span>
                    <span className="p-2 rounded-lg bg-stone-100 text-stone-700 font-mono text-center">MIRATEA Professional</span>
                    <span className="p-2 rounded-lg bg-stone-100 text-stone-700 font-mono text-center">MIRATEA Admin</span>
                    <span className="p-2 rounded-lg bg-stone-100 text-stone-700 font-mono text-center">MIRATEA AI</span>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/2 bg-stone-50 p-6 rounded-2xl border border-stone-200 space-y-4">
                <h4 className="font-bold text-sm text-[#1B3A52] uppercase tracking-wider">Firmas Comerciales Oficiales</h4>
                <ul className="space-y-3 text-sm">
                  <li className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                    <span className="font-semibold text-stone-800">MIRATEA by Solutech</span>
                    <span className="text-xs text-stone-400 font-mono">Principal</span>
                  </li>
                  <li className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between">
                    <span className="font-semibold text-stone-800">Solutech presenta MIRATEA</span>
                    <span className="text-xs text-stone-400 font-mono">Lanzamientos</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: PALETA CROMÁTICA */}
        <section id="colores" className="scroll-mt-24">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-moss-100 text-moss-800">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold text-[#1B3A52]">5. Paleta Cromática Oficial</h2>
                <p className="text-sm text-stone-500">Fichas de color diseñadas para alta accesibilidad y contraste.</p>
              </div>
            </div>
            {copiedHex && (
              <span className="text-xs font-mono bg-stone-800 text-white px-3 py-1 rounded-full animate-fade-in">
                HEX {copiedHex} copiado
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COLOR_TOKENS.map((token, idx) => (
              <div
                key={idx}
                onClick={() => handleCopyHex(token.hex)}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-soft flex flex-col justify-between cursor-pointer hover:border-stone-400 transition-all"
              >
                <div>
                  <div className={token.previewContainerBg || ''}>
                    <div className={`h-28 ${token.bgClass} p-4 rounded-2xl flex flex-col justify-between relative border ${token.borderClass}`}>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md backdrop-blur-md bg-stone-900/30 text-white w-max`}>
                        {token.role}
                      </span>
                      <div className="flex justify-between items-end">
                        <span className={`font-display font-bold text-xl ${token.textColorPreview || 'text-white'}`}>{token.name}</span>
                        <span className={`font-mono text-xs ${token.textColorPreview || 'text-white'} opacity-90`}>{token.hex}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-xs text-stone-600 leading-relaxed">{token.useCase}</p>
                    
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-mono text-stone-500">
                      <span>RGB: {token.rgb}</span>
                      <span className="px-2 py-0.5 rounded bg-stone-100">{token.tailwind}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: IDENTIDAD VERBAL & TONO */}
        <section id="identidad-verbal" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">6. Identidad Verbal & Comparador de Tono</h2>
              <p className="text-sm text-stone-500">Cómo hablamos en MIRATEA vs expresiones estrictamente prohibidas.</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-card">
            <div className="flex justify-center mb-8">
              <div className="bg-stone-100 p-1 rounded-2xl flex items-center gap-1 border border-stone-200">
                <button
                  onClick={() => setToneTab('miratea')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    toneTab === 'miratea'
                      ? 'bg-[#1B3A52] text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Voz MIRATEA (Amable y Clara)</span>
                </button>
                <button
                  onClick={() => setToneTab('forbidden')}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    toneTab === 'forbidden'
                      ? 'bg-rose-900 text-white shadow-sm'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>Patrones Prohibidos (Punitivos)</span>
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {toneTab === 'miratea' ? (
                <motion.div
                  key="miratea-tone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {[
                    { context: 'Evaluación de rutina', text: '"Has completado la respiración. ¿Cómo sientes tu cuerpo ahora?"', note: 'Enfoque en la percepción corporal interna sin juicios de bien/mal.' },
                    { context: 'Registro de objetivo', text: '"¡Gran esfuerzo! Has añadido 1 chispa de valentía a tu colección."', note: 'Refuerzo positivo acumulativo que jamás decrece.' },
                    { context: 'Retorno a la app', text: '"Bienvenido de nuevo. Tu espacio de calma está listo cuando lo necesites."', note: 'Cero reproches ni culpas por días transcurridos sin entrar.' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold text-emerald-700 block mb-1">{item.context}</span>
                        <p className="text-base font-medium text-emerald-950">{item.text}</p>
                      </div>
                      <span className="text-xs text-emerald-700 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
                        {item.note}
                      </span>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="forbidden-tone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {[
                    { context: 'Evaluación de rutina', text: '"¡Has fallado en tu objetivo de hoy! Inténtalo de nuevo mañana."', note: 'Genera espiral de frustración y culpa.' },
                    { context: 'Registro de objetivo', text: '"Llevas 0 días consecutivos. Se ha roto tu racha."', note: 'Destruye la motivación intrínseca.' },
                    { context: 'Retorno a la app', text: '"¡Te echamos de menos! Lumi se ha puesto triste porque lo abandonaste."', note: 'Chantaje emocional mediante la mascota.' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-mono font-bold text-rose-700 block mb-1">{item.context}</span>
                        <p className="text-base font-medium text-rose-950">{item.text}</p>
                      </div>
                      <span className="text-xs text-rose-700 bg-white/80 px-3 py-1.5 rounded-xl border border-rose-200 shrink-0">
                        {item.note}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* SECTION 7: MÓDULOS MIRATEA */}
        <section id="modulos" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-orange-100 text-orange-800">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">7. Arquitectura Funcional de Módulos</h2>
              <p className="text-sm text-stone-500">Selecciona cada módulo para explorar sus características y usuarios objetivo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Module Selectors */}
            <div className="lg:col-span-4 space-y-2">
              {MIRATEA_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setSelectedModule(mod.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedModule === mod.id
                      ? 'bg-white border-[#1B3A52] shadow-card ring-2 ring-[#1B3A52]/10'
                      : 'bg-white/60 border-stone-200 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-[#1B3A52]">{mod.name}</h4>
                    <span className="text-xs text-stone-500">{mod.badge}</span>
                  </div>
                  <ArrowRight className={`w-4 h-4 transition-transform ${selectedModule === mod.id ? 'translate-x-1 text-[#1B3A52]' : 'text-stone-300'}`} />
                </button>
              ))}
            </div>

            {/* Selected Module Detail */}
            <div className="lg:col-span-8">
              {MIRATEA_MODULES.filter((m) => m.id === selectedModule).map((mod) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-3xl border border-stone-200 p-8 shadow-card flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${mod.colorTheme}`}>
                        {mod.badge}
                      </span>
                      <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded-md">
                        {mod.status}
                      </span>
                    </div>

                    <h3 className="text-2xl font-display font-bold text-[#1B3A52] mb-3">{mod.name}</h3>
                    <p className="text-stone-600 text-sm leading-relaxed mb-6">{mod.description}</p>

                    <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 mb-6">
                      <span className="text-[10px] uppercase font-mono font-bold text-stone-400 block mb-1">Público Objetivo</span>
                      <p className="text-xs font-medium text-stone-800">{mod.targetUser}</p>
                    </div>

                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Funcionalidades Clave</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {mod.keyFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-stone-700 bg-white p-2.5 rounded-xl border border-stone-100">
                          <CheckCircle className="w-3.5 h-3.5 text-moss-600 shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 8: DEMO INTERACTIVO RINCÓN DE CALMA */}
        <section id="calma-demo" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-lavender-100 text-lavender-800">
              <Volume2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">8. Rincón de Calma Sensorial & Mascota (Lumi)</h2>
              <p className="text-sm text-stone-500">Demostración en vivo de la experiencia sin sobreestimulación.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Box Breathing Simulator */}
            <div className="bg-white rounded-3xl border border-lavender-200 p-8 shadow-card flex flex-col justify-between items-center text-center">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-lavender-700 bg-lavender-50 px-3 py-1 rounded-full border border-lavender-200 mb-4 inline-block">
                  Respiración Guiada Box Breathing (4-4-4-4)
                </span>
                <h3 className="text-xl font-bold text-[#1B3A52] mb-2">Simulador de Autorregulación</h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto mb-8">
                  Respira al ritmo armónico para pausar la sobrecarga sensorial.
                </p>
              </div>

              {/* Animated Circle */}
              <div className="relative w-44 h-44 flex items-center justify-center my-4">
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                    breathPhase === 'Inhala'
                      ? 'scale-110 bg-lavender-300/40 border-2 border-lavender-500'
                      : breathPhase === 'Mantén'
                      ? 'scale-110 bg-lavender-400/50 border-2 border-lavender-600'
                      : breathPhase === 'Exhala'
                      ? 'scale-90 bg-lavender-200/30 border-2 border-lavender-400'
                      : 'scale-95 bg-lavender-100/20 border-2 border-lavender-300'
                  }`}
                />
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-lg font-display font-bold text-lavender-900">{breathPhase}</span>
                  <span className="text-xs font-mono text-lavender-700 mt-1">{isBreathingRunning ? `${breathProgress}%` : 'Pausado'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setIsBreathingRunning(!isBreathingRunning)}
                  className="px-6 py-2.5 rounded-2xl bg-[#8E6DBC] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#7a56a9] transition-colors shadow-sm"
                >
                  {isBreathingRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isBreathingRunning ? 'Detener Simulador' : 'Probar Respiración'}</span>
                </button>
              </div>
            </div>

            {/* Lumi Stage Showcase */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-card flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-bloom-700 bg-bloom-50 px-3 py-1 rounded-full border border-bloom-200 mb-4 inline-block">
                  Mascota Adaptativa Abstracta
                </span>
                <h3 className="text-xl font-bold text-[#1B3A52] mb-2">Compañero Mágico Invariable: Lumi</h3>
                <p className="text-xs text-stone-500 mb-6">
                  Sin rostro predefinido ni estereotipos. Evoluciona siempre hacia adelante y jamás pierde su nivel alcanzado.
                </p>

                <div className="space-y-3">
                  {[
                    { stage: 'Semilla de Luz', level: 'Fase Initial', desc: 'Compañero abstracto suave, ideal para el inicio del camino.' },
                    { stage: 'Brote Armónico', level: 'Fase Intermedia', desc: 'Evolución con destellos suaves según objetivos cumplidos.' },
                    { stage: 'Lumi Aurora', level: 'Fase Avanzada', desc: 'Resplandor completo y acompañamiento diario consolidado.' }
                  ].map((st, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-bloom-400 to-amber-300 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        ✨
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-stone-800">{st.stage}</h4>
                          <span className="text-[10px] font-mono text-bloom-600 bg-bloom-50 px-2 py-0.5 rounded">{st.level}</span>
                        </div>
                        <p className="text-xs text-stone-500">{st.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 text-[11px] text-stone-500 font-mono flex items-center justify-between">
                <span>Garantía Anti-Involución: Enforzada en DB & Cliente</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 9: CLAIMS & ELEVATOR PITCHES */}
        <section id="dossier" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">9. Kit Comercial & Mensajes Clave</h2>
              <p className="text-sm text-stone-500">Argumentario oficial para presentaciones institucionales, web y prensa.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Elevator pitch corporativo */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-soft">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1B3A52] block mb-3">Elevator Pitch Corporativo (60 segundos)</span>
              <p className="text-sm text-stone-700 leading-relaxed font-serif italic bg-stone-50 p-5 rounded-2xl border border-stone-100">
                "Solutech presenta MIRATEA, la plataforma digital que transforma la gestión diaria en contextos TEA. Diseñada bajo principios de neurodiversidad y calma sensorial, MIRATEA permite a familias y terapeutas coordinar rutinas, descomponer objetivos complejos mediante IA y medir la evolución emocional con absoluta privacidad. Eliminamos el estrés de las rachas y la comparación social para centrarnos en la calidad de vida real."
              </p>
            </div>

            {/* Elevator pitch breve */}
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-soft">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1B3A52] block mb-3">Elevator Pitch Breve (15 segundos)</span>
              <p className="text-sm text-stone-700 leading-relaxed font-serif italic bg-stone-50 p-5 rounded-2xl border border-stone-100">
                "MIRATEA ayuda a familias y profesionales TEA a coordinarse mejor con tecnología simple, segura y útil para apoyar la autorregulación y el crecimiento diario."
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 10: DO / DON'T (PATRONES ÉTICOS VS OSCUROS) */}
        <section id="principios" className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-[#1B3A52]">10. Reglas Inquebrantables (Do / Don't)</h2>
              <p className="text-sm text-stone-500">Restricciones técnicas y éticas del diseño del producto.</p>
            </div>
          </div>

          <div className="space-y-4">
            {PRINCIPLE_RULES.map((rule, idx) => (
              <div key={idx} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-soft">
                <h3 className="font-bold text-base text-[#1B3A52] mb-4">{rule.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase block mb-1">Permitido & Obligatorio (Do)</span>
                      <p className="text-xs text-emerald-950 font-medium">{rule.allowed}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-rose-800 uppercase block mb-1">Estrictamente Prohibido (Don't)</span>
                      <p className="text-xs text-rose-950 font-medium">{rule.prohibited}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 italic bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                  <strong>Justificación clínica:</strong> {rule.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-stone-200 bg-white py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-[#1B3A52]">Solutech · MIRATEA</span>
            <span className="text-stone-300">|</span>
            <span>Brand Book Oficial v1.0</span>
          </div>
          <p className="text-stone-500 font-mono">Desarrollado e impulsado por Xavi Alonso (Solutech)</p>
        </div>
      </footer>
    </div>
  );
}
