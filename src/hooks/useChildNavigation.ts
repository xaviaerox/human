'use client';

import { useState, useEffect } from 'react';
import { WORLD_THEMES, type WorldTheme } from '@/components/worlds/worldThemes';

export function useChildNavigation() {
  const [activeTab, setActiveTab] = useState<'hogar' | 'routines' | 'goals' | 'checkin'>('hogar');

  const [selectedWorld, setSelectedWorldState] = useState<WorldTheme>(() => {
    if (typeof window !== 'undefined') {
      const savedWorldId = localStorage.getItem('mira_selected_world_id');
      if (savedWorldId) {
        const found = WORLD_THEMES.find((w) => w.id === savedWorldId);
        if (found) return found;
      }
    }
    return WORLD_THEMES[0]!;
  });

  const setSelectedWorld = (world: WorldTheme) => {
    setSelectedWorldState(world);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mira_selected_world_id', world.id);
    }
  };

  const [silentMode, setSilentModeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mira_silent_mode') === 'true';
    }
    return false;
  });

  const toggleSilentMode = () => {
    setSilentModeState((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mira_silent_mode', String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      queueMicrotask(() => setSilentModeState(true));
    }
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' :
    hour < 18 ? 'Buenas tardes' :
    'Buenas noches';

  return {
    activeTab,
    setActiveTab,
    selectedWorld,
    setSelectedWorld,
    silentMode,
    toggleSilentMode,
    greeting,
  };
}
