'use client';

import { useState, useEffect } from 'react';

/**
 * useReducedMotion — Respects the user's system-level preference for reduced motion.
 *
 * Returns `true` when the OS/browser has `prefers-reduced-motion: reduce` active.
 * This is critical for neurodiverse users (ADHD, ASD, vestibular disorders) who
 * may experience discomfort or cognitive overload from continuous animations.
 *
 * Usage:
 *   const reducedMotion = useReducedMotion();
 *   if (!reducedMotion) { // only animate when safe }
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    // SSR-safe: default to false during server render
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReduced(e.matches);
    };

    // Modern browsers — subscribe to future changes
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReduced;
}
