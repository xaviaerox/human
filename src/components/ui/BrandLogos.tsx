import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark';
  showSubtitle?: boolean;
  className?: string;
}

/**
 * LOGO ÚNICO Y OFICIAL DE MIRATEA
 * Basado en la estrella beacon y aureola teal del producto.
 */
export function MirateaLogo({
  size = 'md',
  variant = 'light',
  showSubtitle = true,
  className = ''
}: LogoProps) {
  const dimensionMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const textMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl'
  };

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icono Único MIRATEA */}
      <div className={`relative flex items-center justify-center shrink-0 ${dimensionMap[size]}`}>
        <svg viewBox="0 0 512 512" className="w-full h-full drop-shadow-md" aria-hidden="true">
          <defs>
            <linearGradient id="mirateaSingleBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#115e59" />
            </linearGradient>
            <linearGradient id="mirateaSingleStar" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <rect width="512" height="512" rx="128" fill="url(#mirateaSingleBg)" />
          <circle cx="256" cy="256" r="160" fill="none" stroke="#fef08a" strokeWidth="8" opacity="0.35" />
          <path
            d="M 256 80 C 256 180 180 256 80 256 C 180 256 256 332 256 432 C 256 332 332 256 432 256 C 332 256 256 180 256 80 Z"
            fill="url(#mirateaSingleStar)"
          />
          <circle cx="256" cy="256" r="28" fill="#ffffff" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-display font-extrabold tracking-tight ${textMap[size]} ${isDark ? 'text-white' : 'text-[#1B3A52]'}`}>
          miratea
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${isDark ? 'text-sky-400' : 'text-bloom-600'}`}>
            by Solutech
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * LOGO REAL DE SOLUTECH
 * Escudo de protección IT naranja con trazados de circuitos y letra S.
 */
export function SolutechLogo({
  size = 'md',
  variant = 'light',
  className = ''
}: LogoProps) {
  const dimensionMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Escudo Real de Solutech */}
      <div className={`relative flex items-center justify-center shrink-0 ${dimensionMap[size]}`}>
        <Image
          src="/miratea/solutech-logo.png"
          alt="Solutech Logo Real"
          width={80}
          height={80}
          className="w-full h-full object-contain rounded-xl"
        />
      </div>

      <div className="flex flex-col">
        <span className={`font-display font-black tracking-wider ${textMap[size]} ${isDark ? 'text-white' : 'text-[#1B3A52]'}`}>
          SOLUTECH
        </span>
        <span className={`text-[9px] font-mono tracking-widest uppercase ${isDark ? 'text-stone-400' : 'text-stone-500'}`}>
          Soporte, Seguridad & Desarrollo IT
        </span>
      </div>
    </div>
  );
}

/**
 * PERFIL DE XAVI ALONSO SIMÉTRICO
 * Diseñado con la misma estructura y paleta de color que los logotipos.
 */
export function XaviProfileCard({
  size = 'md',
  variant = 'light',
  className = ''
}: LogoProps) {
  const dimensionMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const textMap = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Fotografía de Xavi Alonso */}
      <div className={`relative flex items-center justify-center shrink-0 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm ${dimensionMap[size]}`}>
        <Image
          src="/miratea/xavi-alonso.jpg"
          alt="Xavi Alonso"
          width={100}
          height={100}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col">
        <span className={`font-display font-bold tracking-tight ${textMap[size]} ${isDark ? 'text-white' : 'text-[#1B3A52]'}`}>
          Xavi Alonso
        </span>
        <span className={`text-[9px] font-mono tracking-widest uppercase font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
          Fundador & Desarrollador Principal
        </span>
      </div>
    </div>
  );
}
