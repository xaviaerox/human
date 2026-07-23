'use client';

import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface WorldAmbientVisualsProps {
  worldId: string;
  phase: 'seed' | 'sprout' | 'bloom';
  silentMode?: boolean;
}

export function WorldAmbientVisuals({ worldId, phase, silentMode = false }: WorldAmbientVisualsProps) {
  // Respect the user's OS-level preference for reduced motion (critical for neurodiverse users)
  const prefersReduced = useReducedMotion();
  // noAnim: suppress ALL continuous animations when silentMode OR prefers-reduced-motion is active
  const noAnim = silentMode || prefersReduced;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none flex flex-col justify-end">
      {!noAnim && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin-windmill {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes waterfall-flow {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -20; }
          }
          @keyframes float-cloud {
            0%, 100% { transform: translateX(0px) translateY(0px); }
            50% { transform: translateX(8px) translateY(-2px); }
          }
          @keyframes float-balloon {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-8px) translateX(2px); }
          }
          @keyframes glow-seed {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.6)); opacity: 0.85; }
            50% { transform: scale(1.08); filter: drop-shadow(0 0 12px rgba(251, 191, 36, 1)); opacity: 1; }
          }
          @keyframes flag-flap {
            0%, 100% { transform: skewY(0deg) scaleX(1); }
            50% { transform: skewY(-4deg) scaleX(0.95); }
          }
          @keyframes eagle-soar {
            0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
            50% { transform: translate(-12px, -6px) scale(0.95) rotate(-3deg); }
          }
          .anim-windmill {
            animation: spin-windmill 12s linear infinite;
            transform-origin: 18px 50px;
          }
          .anim-waterfall {
            stroke-dasharray: 4, 4;
            animation: waterfall-flow 1.2s linear infinite;
          }
          .anim-cloud {
            animation: float-cloud 7s ease-in-out infinite;
          }
          .anim-balloon {
            animation: float-balloon 5s ease-in-out infinite;
            transform-origin: 82px 55px;
          }
          .anim-seed-pulse {
            animation: glow-seed 2s ease-in-out infinite;
          }
          .anim-flag {
            animation: flag-flap 1.5s ease-in-out infinite;
            transform-origin: 22px 22px;
          }
          .anim-eagle {
            animation: eagle-soar 8s ease-in-out infinite;
            transform-origin: 78px 30px;
          }
        `}} />
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 1. LAGO DE LA CALMA */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'lago_calma' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-950 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-sky-900 to-blue-900 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 via-sky-300 to-blue-500" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="calmWater" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="doubleRainbow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(239,68,68,0.25)" />
                <stop offset="25%" stopColor="rgba(245,158,11,0.25)" />
                <stop offset="50%" stopColor="rgba(16,185,129,0.25)" />
                <stop offset="75%" stopColor="rgba(59,130,246,0.25)" />
                <stop offset="100%" stopColor="rgba(139,92,246,0.25)" />
              </linearGradient>
              <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Background Hills */}
            <path d="M 0 55 Q 20 48 40 55 T 80 50 T 100 56 L 100 100 L 0 100 Z" fill="#0369a1" opacity={phase === 'bloom' ? 0.35 : phase === 'sprout' ? 0.2 : 0.15} />

            {/* Water layers */}
            <path d="M 0 65 Q 25 58 50 64 T 100 60 L 100 100 L 0 100 Z" fill="url(#calmWater)" opacity={phase === 'bloom' ? 0.8 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 78 Q 30 72 60 79 T 100 74 L 100 100 L 0 100 Z" fill="#0284c7" opacity={phase === 'bloom' ? 0.9 : phase === 'sprout' ? 0.6 : 0.4} />

            {/* Rainbow - only in Bloom */}
            {phase === 'bloom' && (
              <>
                <path d="M -10 65 Q 50 -10 110 65" fill="none" stroke="url(#doubleRainbow)" strokeWidth="6" />
                <path d="M -15 65 Q 50 -18 115 65" fill="none" stroke="url(#doubleRainbow)" strokeWidth="3" opacity="0.6" />
              </>
            )}

            {/* Mist overlay - only in Seed */}
            {phase === 'seed' && (
              <>
                <path d="M -20 60 Q 20 50 60 62 T 120 58 L 120 75 L -20 75 Z" fill="#475569" opacity="0.25" />
                <path d="M -10 68 Q 30 60 70 70 T 110 65 L 110 85 L -10 85 Z" fill="#334155" opacity="0.2" />
              </>
            )}

            {/* Waterfall on Left - only in Sprout (thin) and Bloom (epic) */}
            {phase === 'sprout' && (
              <g>
                <rect x="8" y="25" width="3" height="40" fill="#a5f3fc" opacity="0.7" />
                <line x1="9.5" y1="25" x2="9.5" y2="65" stroke="#ffffff" strokeWidth="0.8" className="anim-waterfall" />
              </g>
            )}

            {phase === 'bloom' && (
              <g>
                {/* Rocks */}
                <path d="M 0 20 L 14 20 L 12 66 L 0 66 Z" fill="#334155" />
                <path d="M 0 35 L 17 38 L 16 66 L 0 66 Z" fill="#1e293b" opacity="0.7" />
                {/* Main waterfall */}
                <rect x="2" y="20" width="10" height="46" fill="#7dd3fc" />
                {/* Flow lines */}
                <line x1="3.5" y1="20" x2="3.5" y2="66" stroke="#f0f9ff" strokeWidth="1.2" className="anim-waterfall" />
                <line x1="7" y1="20" x2="7" y2="66" stroke="#ffffff" strokeWidth="1" className="anim-waterfall" />
                <line x1="10.5" y1="20" x2="10.5" y2="66" stroke="#e0f2fe" strokeWidth="1.2" className="anim-waterfall" />
                {/* Splashes */}
                <ellipse cx="7" cy="65" rx="6" ry="2" fill="#ffffff" opacity="0.9" />
                <circle cx="4" cy="64" r="1.5" fill="#e0f2fe" opacity="0.8" />
                <circle cx="10" cy="64" r="1.5" fill="#e0f2fe" opacity="0.8" />
              </g>
            )}

            {/* Seed / Sprout / Bloom right-aligned lilypad & lotus */}
            {phase === 'seed' && (
              <g transform="translate(80, 72) scale(0.65)" className="anim-seed-pulse">
                {/* Lily pad */}
                <ellipse cx="0" cy="5" rx="15" ry="5" fill="#1e293b" />
                {/* Golden magical seed */}
                <circle cx="0" cy="0" r="6" fill="url(#goldGlow)" />
                <circle cx="0" cy="0" r="3" fill="#fef08a" />
              </g>
            )}

            {phase === 'sprout' && (
              <g transform="translate(80, 72) scale(0.7)">
                {/* Lily pad */}
                <ellipse cx="0" cy="5" rx="16" ry="6" fill="#065f46" />
                {/* Sprout bud */}
                <path d="M 0 -12 C -6 -6 -5 4 0 5 C 5 4 6 -6 0 -12 Z" fill="#10b981" />
                <path d="M -4 -8 C -10 -2 -5 4 0 5 Z" fill="#059669" />
                <circle cx="0" cy="-3" r="2" fill="#fef08a" opacity="0.8" className="animate-pulse" />
              </g>
            )}

            {phase === 'bloom' && (
              <g transform="translate(80, 72) scale(0.75)">
                {/* Lily pad */}
                <ellipse cx="0" cy="6" rx="20" ry="7" fill="#065f46" />
                <path d="M -20 6 L -10 6 L -8 8 L -18 8 Z" fill="#044e39" />
                {/* Lotus flower */}
                <g>
                  {/* Outer pink petals */}
                  <path d="M -15 -2 C -24 -12 -12 -22 0 -10 C -12 -22 -24 -12 -15 -2 Z" fill="#f43f5e" opacity="0.9" />
                  <path d="M 15 -2 C 24 -12 12 -22 0 -10 C 12 -22 24 -12 15 -2 Z" fill="#f43f5e" opacity="0.9" />
                  {/* Inner light pink petals */}
                  <path d="M -10 -4 C -18 -12 -8 -20 0 -8 Z" fill="#fda4af" />
                  <path d="M 10 -4 C 18 -12 8 -20 0 -8 Z" fill="#fda4af" />
                  {/* Center glowing golden seed */}
                  <circle cx="0" cy="-6" r="5" fill="url(#goldGlow)" />
                  <circle cx="0" cy="-6" r="2.5" fill="#ffffff" />
                </g>
              </g>
            )}
          </svg>

          {/* Floating effects */}
          {!noAnim && phase === 'seed' && (
            <div className="absolute bottom-6 left-[80%] -translate-x-1/2 text-xs text-yellow-300/60 animate-pulse">✨</div>
          )}
          {!noAnim && phase === 'sprout' && (
            <div className="absolute bottom-12 left-[80%] -translate-x-1/2 text-[10px] animate-bounce text-cyan-300">💧</div>
          )}
          {!noAnim && phase === 'bloom' && (
            <>
              <div className="absolute w-2.5 h-2.5 rounded-full bg-white/50 bottom-14 left-[76%] animate-ambient-float-up" />
              <div className="absolute w-2 h-2 rounded-full bg-white/60 bottom-24 left-[84%] animate-ambient-float-up" style={{ animationDelay: '1.5s' }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-200/40 bottom-8 left-[18%] animate-ambient-float-up" style={{ animationDelay: '0.8s' }} />
              <div className="absolute w-3 h-3 rounded-full bg-sky-200/30 bottom-20 left-[12%] animate-ambient-float-up" style={{ animationDelay: '2.5s' }} />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 2. VALLE DE LOS HÁBITOS */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'valle_habitos' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-green-100 to-emerald-250 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-orange-250 via-pink-100 to-green-300" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="valleHills1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
              <linearGradient id="valleHills2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#166534" />
              </linearGradient>
              <radialGradient id="seedGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
                <stop offset="60%" stopColor="#ea580c" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Hills */}
            <path d="M 0 58 Q 25 48 50 58 T 100 52 L 100 100 L 0 100 Z" fill={phase === 'bloom' ? 'url(#valleHills1)' : phase === 'sprout' ? '#86efac' : '#78716c'} opacity={0.8} />
            <path d="M 0 70 Q 35 62 70 72 T 100 66 L 100 100 L 0 100 Z" fill={phase === 'bloom' ? 'url(#valleHills2)' : phase === 'sprout' ? '#4ade80' : '#57534e'} opacity={0.9} />

            {/* Seed: left-aligned brown seed pulsing */}
            {phase === 'seed' && (
              <g transform="translate(20, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="12" ry="4" fill="#44403c" />
                <circle cx="0" cy="0" r="7" fill="url(#seedGlow)" />
                <path d="M -3 0 C -3 -5 3 -5 3 0 Z" fill="#78350f" />
              </g>
            )}

            {/* Sprout: sapling on the right */}
            {phase === 'sprout' && (
              <g transform="translate(82, 68) scale(0.75)">
                {/* Trunk */}
                <path d="M -1.5 15 L -1 0 L 1 0 L 1.5 15 Z" fill="#7c2d12" />
                {/* Leaves */}
                <circle cx="0" cy="-6" r="8" fill="#15803d" />
                <circle cx="-5" cy="-3" r="6" fill="#166534" />
                <circle cx="5" cy="-3" r="6" fill="#22c55e" />
              </g>
            )}

            {/* Bloom: Windmill on left, big Apple Tree on right, flowers */}
            {phase === 'bloom' && (
              <>
                {/* Windmill (Left, x=18) */}
                <g>
                  {/* Tower */}
                  <polygon points="12,74 15,50 21,50 24,74" fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="0.5" />
                  <polygon points="15,50 18,44 21,50" fill="#7c2d12" />
                  {/* Door */}
                  <rect x="16" y="66" width="4" height="8" rx="1" fill="#7c2d12" />
                  {/* Spinning sails */}
                  <g className="anim-windmill">
                    <line x1="18" y1="50" x2="18" y2="30" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="18,30 22,34 18,44 14,34" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="18" y2="70" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="18,70 22,66 18,56 14,66" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="38" y2="50" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="38,50 34,46 24,50 34,54" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <line x1="18" y1="50" x2="-2" y2="50" stroke="#7c2d12" strokeWidth="1.2" />
                    <polygon points="-2,50 2,46 12,50 2,54" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.5" opacity="0.9" />

                    <circle cx="18" cy="50" r="2" fill="#f59e0b" />
                  </g>
                </g>

                {/* Apple Tree (Right, x=82) */}
                <g transform="translate(82, 65) scale(0.8)">
                  {/* Trunk */}
                  <path d="M -4 20 L -2 -4 L 2 -4 L 4 20 Z" fill="#78350f" />
                  <path d="M -2 -4 Q -10 -15 -12 -12" fill="none" stroke="#78350f" strokeWidth="2.5" />
                  <path d="M 2 -4 Q 10 -15 12 -12" fill="none" stroke="#78350f" strokeWidth="2" />
                  {/* Foliage */}
                  <circle cx="0" cy="-15" r="18" fill="#15803d" />
                  <circle cx="-12" cy="-8" r="14" fill="#166534" />
                  <circle cx="12" cy="-8" r="14" fill="#15803d" />
                  <circle cx="-8" cy="-22" r="12" fill="#166534" />
                  <circle cx="8" cy="-22" r="12" fill="#22c55e" />
                  {/* Apples */}
                  <circle cx="-6" cy="-8" r="2.5" fill="#ef4444" />
                  <circle cx="6" cy="-14" r="2.5" fill="#ef4444" />
                  <circle cx="2" cy="-5" r="2.5" fill="#ef4444" />
                  <circle cx="-8" cy="-20" r="2.5" fill="#ef4444" />
                  <circle cx="8" cy="-10" r="2.5" fill="#ef4444" />
                  <circle cx="0" cy="-24" r="2.5" fill="#ef4444" />
                </g>

                {/* Wildflowers */}
                <g transform="translate(14, 76) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#db2777" />
                  <circle cx="-5" cy="0" r="3" fill="#fbcfe8" /><circle cx="5" cy="0" r="3" fill="#fbcfe8" />
                  <circle cx="0" cy="-5" r="3" fill="#fbcfe8" /><circle cx="0" cy="5" r="3" fill="#fbcfe8" />
                </g>
                <g transform="translate(24, 79) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#ca8a04" />
                  <circle cx="-5" cy="0" r="3" fill="#fef08a" /><circle cx="5" cy="0" r="3" fill="#fef08a" />
                  <circle cx="0" cy="-5" r="3" fill="#fef08a" /><circle cx="0" cy="5" r="3" fill="#fef08a" />
                </g>
                <g transform="translate(74, 73) scale(0.4)">
                  <circle cx="0" cy="0" r="4" fill="#2563eb" />
                  <circle cx="-5" cy="0" r="3" fill="#93c5fd" /><circle cx="5" cy="0" r="3" fill="#93c5fd" />
                  <circle cx="0" cy="-5" r="3" fill="#93c5fd" /><circle cx="0" cy="5" r="3" fill="#93c5fd" />
                </g>
              </>
            )}
          </svg>

          {/* Falling Leaves & Petals - only in Sprout and Bloom */}
          {!noAnim && phase === 'sprout' && (
            <div className="absolute top-6 right-[20%] text-xs opacity-60 animate-ambient-float-down">🍃</div>
          )}
          {!noAnim && phase === 'bloom' && (
            <>
              <div className="absolute top-2 left-6 text-xs animate-ambient-float-down">🌸</div>
              <div className="absolute top-8 right-6 text-[10px] animate-ambient-float-down" style={{ animationDelay: '2s' }}>🌸</div>
              <div className="absolute top-14 left-[20%] text-xs animate-ambient-float-down" style={{ animationDelay: '1.2s' }}>🍃</div>
              <div className="absolute top-4 right-[25%] text-[9px] animate-ambient-float-down" style={{ animationDelay: '3.5s' }}>🍃</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 3. BOSQUE DE LA AUTONOMÍA */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'bosque_autonomia' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-900 via-stone-850 to-slate-900 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-teal-900 to-indigo-950 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-teal-950 to-emerald-950" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="bioGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
                <stop offset="50%" stopColor="#059669" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="mushGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Silhouette Hills */}
            <path d="M 0 62 Q 25 52 50 62 T 100 58 L 100 100 L 0 100 Z" fill="#022c22" opacity={phase === 'bloom' ? 0.75 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 74 Q 35 66 70 76 T 100 70 L 100 100 L 0 100 Z" fill="#011c14" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.65 : 0.45} />
            <path d="M 0 85 Q 20 80 50 88 T 100 84 L 100 100 L 0 100 Z" fill="#000f0a" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.75 : 0.55} />

            {/* Crescent Moon - in Sprout (faint) and Bloom (bright) */}
            {phase === 'sprout' && (
              <path d="M 12 12 A 6 6 0 1 0 24 17 A 4.5 4.5 0 1 1 12 12 Z" fill="#fef08a" opacity="0.4" />
            )}
            {phase === 'bloom' && (
              <path d="M 14 12 A 7 7 0 1 0 28 18 A 5.5 5.5 0 1 1 14 12 Z" fill="#fef08a" opacity="0.85" filter="drop-shadow(0 0 4px #fef08a)" />
            )}

            {/* Seed: left-aligned bio-luminescent seed */}
            {phase === 'seed' && (
              <g transform="translate(18, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#0c0a09" />
                <circle cx="0" cy="0" r="7" fill="url(#bioGlow)" />
                <circle cx="0" cy="0" r="2" fill="#86efac" />
              </g>
            )}

            {/* Sprout: small glowing mushrooms on left */}
            {phase === 'sprout' && (
              <g transform="translate(18, 75) scale(0.7)">
                {/* Mushrooms */}
                <path d="M -4 10 Q -2 0 -2 -2 L 2 -2 Q 2 0 4 10 Z" fill="#e2e8f0" />
                <path d="M -6 -2 C -6 -7 6 -7 6 -2 Z" fill="#0ea5e9" />
                <circle cx="-1" cy="-4" r="1" fill="#ffffff" />
                <circle cx="2" cy="-3" r="1.5" fill="#ffffff" />
                {/* Glow aura */}
                <circle cx="0" cy="-4" r="8" fill="url(#mushGlow)" opacity="0.4" />
              </g>
            )}

            {/* Bloom: Giant Oak and glowing mushrooms on left, lanterns and pines on right */}
            {phase === 'bloom' && (
              <>
                {/* Oak Tree with glowing mushrooms (Left, x=15) */}
                <g>
                  {/* Trunk */}
                  <path d="M 11 76 L 13 46 Q 10 38 7 35 Q 16 38 17 46 L 19 76 Z" fill="#1f2937" />
                  {/* Foliage */}
                  <circle cx="15" cy="30" r="14" fill="#044e39" />
                  <circle cx="8" cy="36" r="11" fill="#064e3b" />
                  <circle cx="21" cy="34" r="11" fill="#065f46" />
                  {/* Glowing mushrooms at the base */}
                  <g transform="translate(19, 72) scale(0.5)">
                    <path d="M -2 10 Q -1 0 -1 -2 L 1 -2 Q 1 0 2 10 Z" fill="#e2e8f0" />
                    <path d="M -5 -2 C -5 -6 5 -6 5 -2 Z" fill="#38bdf8" />
                    <circle cx="0" cy="-3" r="8" fill="url(#mushGlow)" opacity="0.6" />
                  </g>
                  <g transform="translate(12, 74) scale(0.4)">
                    <path d="M -2 10 Q -1 0 -1 -2 L 1 -2 Q 1 0 2 10 Z" fill="#e2e8f0" />
                    <path d="M -5 -2 C -5 -6 5 -6 5 -2 Z" fill="#10b981" />
                    <circle cx="0" cy="-3" r="8" fill="url(#bioGlow)" opacity="0.6" />
                  </g>
                </g>

                {/* Grand pines with star lanterns (Right, x=85) */}
                <g>
                  {/* Tall Pine */}
                  <g transform="translate(85, 66) scale(0.75)">
                    <rect x="-2.5" y="10" width="5" height="15" fill="#1f2937" />
                    <polygon points="0,-25 -14,-2 14,-2" fill="#022c22" />
                    <polygon points="0,-12 -11,8 11,8" fill="#064e3b" />
                    {/* Hanging Star Lantern */}
                    <line x1="-8" y1="2" x2="-8" y2="8" stroke="#fef08a" strokeWidth="0.8" />
                    <circle cx="-8" cy="10" r="2" fill="#fef08a" filter="drop-shadow(0 0 3px #fef08a)" />
                  </g>
                  {/* Small Pine */}
                  <g transform="translate(93, 72) scale(0.55)">
                    <rect x="-2" y="10" width="4" height="15" fill="#1f2937" />
                    <polygon points="0,-25 -14,-2 14,-2" fill="#022c22" />
                    <polygon points="0,-12 -11,8 11,8" fill="#064e3b" />
                  </g>
                </g>
              </>
            )}
          </svg>

          {/* Twinkling Fireflies - Sprout (few) and Bloom (many) */}
          {!noAnim && phase === 'sprout' && (
            <div className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full blur-[1px] bottom-16 left-[15%] animate-firefly" />
          )}
          {!noAnim && phase === 'bloom' && (
            <>
              <div className="absolute w-2 h-2 bg-yellow-300 rounded-full blur-[1.5px] bottom-20 left-[12%] animate-firefly" />
              <div className="absolute w-1.5 h-1.5 bg-yellow-250 rounded-full blur-[1px] bottom-28 right-[14%] animate-firefly" style={{ animationDelay: '1s' }} />
              <div className="absolute w-2 h-2 bg-green-200 rounded-full blur-[1.5px] bottom-36 left-[22%] animate-firefly" style={{ animationDelay: '2.2s' }} />
              <div className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full blur-[1px] bottom-12 right-[20%] animate-firefly" style={{ animationDelay: '1.5s' }} />
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 4. MONTAÑAS DEL ESFUERZO */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'montana_esfuerzo' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-350 via-slate-100 to-blue-200 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-blue-950 to-indigo-950" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="auroraGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0" />
                <stop offset="50%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="crystalGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Aurora - Bloom only */}
            {phase === 'bloom' && (
              <>
                <path d="M 0 35 Q 30 15 60 40 T 100 30 L 100 60 L 0 60 Z" fill="url(#auroraGreen)" />
                <path d="M 0 25 Q 40 45 70 20 T 100 35 L 100 65 L 0 65 Z" fill="url(#auroraGreen)" opacity="0.6" />
              </>
            )}

            {/* Mountains */}
            <path d="M 0 100 L 22 38 L 48 76 L 76 44 L 100 85 L 100 100 Z" fill="#475569" opacity={phase === 'bloom' ? 0.75 : phase === 'sprout' ? 0.5 : 0.3} />
            <path d="M 0 100 L 16 54 L 38 42 L 68 72 L 100 52 L 100 100 Z" fill="#334155" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.6 : 0.4} />
            <path d="M 0 100 L 28 72 L 56 62 L 82 82 L 100 76 L 100 100 Z" fill="#1e293b" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.7 : 0.5} />

            {/* Seed: frozen crystal seed left-aligned */}
            {phase === 'seed' && (
              <g transform="translate(20, 78) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="9" ry="3" fill="#334155" />
                <circle cx="0" cy="0" r="7" fill="url(#crystalGlow)" />
                <polygon points="0,-5 4,0 0,5 -4,0" fill="#e2e8f0" />
              </g>
            )}

            {/* Sprout: icy flower bud */}
            {phase === 'sprout' && (
              <g transform="translate(20, 72) scale(0.7)">
                <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#334155" />
                <path d="M 0 -8 C -4 -4 -3 2 0 3 C 3 2 4 -4 0 -8 Z" fill="#93c5fd" />
                <path d="M -3 -5 C -6 -1 -3 3 0 3 Z" fill="#60a5fa" />
              </g>
            )}

            {/* Bloom: Flag on left peak (x=22), eagle on right (x=78), stars */}
            {phase === 'bloom' && (
              <>
                {/* Snow Caps */}
                <polygon points="22,38 18,46 26,46" fill="#ffffff" />
                <polygon points="38,42 34,49 42,49" fill="#ffffff" />
                <polygon points="76,44 72,51 80,51" fill="#ffffff" />

                {/* Victory Flag (Left, x=22) */}
                <g>
                  {/* Flagpole */}
                  <line x1="22" y1="38" x2="22" y2="22" stroke="#d1d5db" strokeWidth="1" />
                  {/* Flapping flag */}
                  <g className="anim-flag">
                    <polygon points="22,22 22,29 32,25.5" fill="#ef4444" />
                    <circle cx="27" cy="25.5" r="0.8" fill="#fef08a" />
                  </g>
                </g>

                {/* Eagle soaring (Right, x=78) */}
                <g className="anim-eagle" transform="translate(78, 30) scale(0.85)">
                  {/* Bird body / wings */}
                  <path d="M -10 0 Q -5 -6 0 -1 Q 5 -6 10 0 Q 3 2 0 1 Q -3 2 -10 0 Z" fill="#78350f" />
                  <path d="M -6 -1 L -1 -8 L 0 -8 L -4 -1 Z" fill="#d1d5db" />
                </g>
              </>
            )}
          </svg>

          {/* Particle Effects */}
          {!noAnim && phase === 'seed' && (
            <div className="absolute top-8 left-[20%] text-[8px] opacity-40 animate-pulse text-white">❄️</div>
          )}
          {!noAnim && phase === 'sprout' && (
            <div className="absolute top-10 left-[22%] text-[9px] opacity-60 animate-bounce text-sky-100">❄️</div>
          )}
          {!noAnim && phase === 'bloom' && (
            <>
              {/* Twinkling stars */}
              <div className="absolute top-4 left-6 text-xs animate-pulse text-yellow-300">⭐</div>
              <div className="absolute top-10 right-10 text-[9px] animate-pulse text-yellow-200" style={{ animationDelay: '1.2s' }}>⭐</div>
              <div className="absolute top-6 right-[24%] text-xs animate-pulse text-white" style={{ animationDelay: '0.6s' }}>✨</div>
              <div className="absolute top-14 left-[18%] text-[8px] animate-pulse text-sky-200" style={{ animationDelay: '2s' }}>⭐</div>
            </>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* 5. REINO DE LA VIDA SOCIAL */}
      {/* ──────────────────────────────────────────────────────── */}
      {worldId === 'reino_social' && (
        <div className="absolute inset-0 flex flex-col justify-end">
          {/* Background Gradients */}
          {phase === 'seed' && (
            <div className="absolute inset-0 bg-gradient-to-b from-stone-400 via-stone-300 to-slate-500 opacity-95" />
          )}
          {phase === 'sprout' && (
            <div className="absolute inset-0 bg-gradient-to-b from-purple-100 via-purple-50 to-pink-200 opacity-95" />
          )}
          {phase === 'bloom' && (
            <div className="absolute inset-0 bg-gradient-to-b from-pink-300 via-purple-200 to-fuchsia-400" />
          )}

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rainbowBridge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(244,63,94,0.4)" />
                <stop offset="30%" stopColor="rgba(234,179,8,0.4)" />
                <stop offset="65%" stopColor="rgba(16,185,129,0.4)" />
                <stop offset="100%" stopColor="rgba(99,102,241,0.4)" />
              </linearGradient>
              <linearGradient id="castleWall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a21caf" />
                <stop offset="100%" stopColor="#701a75" />
              </linearGradient>
              <radialGradient id="pinkGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fdf2f8" stopOpacity="1" />
                <stop offset="60%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#be185d" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Silhouette Hills */}
            <path d="M 0 65 Q 20 52 45 62 T 100 58 L 100 100 L 0 100 Z" fill="#c084fc" opacity={phase === 'bloom' ? 0.7 : phase === 'sprout' ? 0.45 : 0.25} />
            <path d="M 0 76 Q 30 68 60 76 T 100 70 L 100 100 L 0 100 Z" fill="#a855f7" opacity={phase === 'bloom' ? 0.85 : phase === 'sprout' ? 0.55 : 0.35} />
            <path d="M 0 86 Q 20 80 50 88 T 100 82 L 100 100 L 0 100 Z" fill="#86198f" opacity={phase === 'bloom' ? 0.95 : phase === 'sprout' ? 0.65 : 0.45} />

            {/* Seed: violet seed right-aligned */}
            {phase === 'seed' && (
              <g transform="translate(80, 75) scale(0.65)" className="anim-seed-pulse">
                <ellipse cx="0" cy="4" rx="9" ry="3" fill="#581c87" />
                <circle cx="0" cy="0" r="7" fill="url(#pinkGlow)" />
                <path d="M -3 0 C -3 -5 3 -5 3 0 Z" fill="#d946ef" />
              </g>
            )}

            {/* Sprout: floating heart-shaped sprout */}
            {phase === 'sprout' && (
              <g transform="translate(80, 68) scale(0.7)">
                <ellipse cx="0" cy="12" rx="8" ry="2.5" fill="#581c87" opacity="0.3" />
                <path d="M 0 -6 C -4 -10 -8 -5 0 3 C 8 -5 4 -10 0 -6 Z" fill="#ec4899" className="animate-pulse" />
              </g>
            )}

            {/* Bloom: Floating castle on left (x=20), Rainbow bridge, Hot air balloon on right (x=80) */}
            {phase === 'bloom' && (
              <>
                {/* Floating Castle (Left, x=20) */}
                <g>
                  {/* Island cloud base */}
                  <ellipse cx="20" cy="58" rx="14" ry="4" fill="#f8fafc" opacity="0.9" />
                  <ellipse cx="20" cy="60" rx="11" ry="3" fill="#e2e8f0" />
                  {/* Castle Walls & Towers */}
                  <rect x="10" y="38" width="20" height="20" fill="url(#castleWall)" />
                  <rect x="7" y="26" width="6" height="32" fill="#701a75" />
                  <polygon points="7,26 10,16 13,26" fill="#be185d" />
                  <rect x="27" y="26" width="6" height="32" fill="#701a75" />
                  <polygon points="27,26 30,16 33,26" fill="#be185d" />
                  <rect x="17" y="32" width="6" height="12" fill="#be185d" />
                  <polygon points="17,32 20,24 23,32" fill="#fbcfe8" />
                  {/* Door */}
                  <rect x="18" y="48" width="4" height="10" rx="2" fill="#3b0764" />
                </g>

                {/* Rainbow Bridge */}
                <path d="M 28 50 Q 52 38 76 50" fill="none" stroke="url(#rainbowBridge)" strokeWidth="4" />

                {/* Hot Air Balloon (Right, x=80) */}
                <g className="anim-balloon" transform="translate(80, 42) scale(0.65)">
                  {/* Balloon */}
                  <ellipse cx="0" cy="-12" rx="11" ry="13" fill="#ec4899" />
                  {/* Stripes */}
                  <path d="M -7 -20 C -2 -14 -2 -6 -7 0 M 7 -20 C 2 -14 2 -6 7 0" fill="none" stroke="#fbcfe8" strokeWidth="2.5" />
                  {/* Ropes */}
                  <line x1="-5" y1="1" x2="-3" y2="7" stroke="#78350f" strokeWidth="0.8" />
                  <line x1="5" y1="1" x2="3" y2="7" stroke="#78350f" strokeWidth="0.8" />
                  {/* Basket */}
                  <rect x="-3" y="7" width="6" height="5" rx="1" fill="#78350f" />
                </g>

                {/* Clouds */}
                <g className="anim-cloud" transform="translate(74, 20) scale(0.65)">
                  <ellipse cx="12" cy="10" rx="10" ry="3.5" fill="#ffffff" opacity="0.6" />
                  <circle cx="6" cy="7" r="5" fill="#ffffff" opacity="0.6" />
                </g>
              </>
            )}
          </svg>

          {/* Floating Hearts */}
          {!noAnim && phase === 'sprout' && (
            <div className="absolute bottom-16 right-[20%] text-xs animate-ambient-float-up text-pink-300 opacity-60">❤️</div>
          )}
          {!noAnim && phase === 'bloom' && (
            <>
              <div className="absolute bottom-16 left-[15%] text-xs animate-ambient-float-up text-red-400 opacity-90">❤️</div>
              <div className="absolute bottom-24 right-[16%] text-sm animate-ambient-float-up text-pink-400 opacity-95" style={{ animationDelay: '2.5s' }}>💖</div>
              <div className="absolute bottom-28 left-[35%] text-xs animate-ambient-float-up text-rose-400 opacity-80" style={{ animationDelay: '4.5s' }}>💝</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
