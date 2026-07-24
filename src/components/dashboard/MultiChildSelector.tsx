'use client';

import React from 'react';
import { User, Plus, Sparkles } from 'lucide-react';
import type { Profile } from '@/types';

interface MultiChildSelectorProps {
  childrenProfiles: Profile[];
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  onAddChild?: () => void;
}

export function MultiChildSelector({
  childrenProfiles,
  selectedChildId,
  onSelectChild,
  onAddChild,
}: MultiChildSelectorProps) {
  if (!childrenProfiles || childrenProfiles.length === 0) return null;

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        Hijos:
      </span>

      <div className="flex items-center gap-2">
        {childrenProfiles.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <button
              key={child.id}
              onClick={() => onSelectChild(child.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700'
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                {child.avatar_base_emoji || <User className="h-3.5 w-3.5" />}
              </div>
              <span>{child.display_name}</span>
            </button>
          );
        })}

        {onAddChild && (
          <button
            onClick={onAddChild}
            className="flex items-center gap-1 rounded-xl border border-dashed border-slate-700 bg-slate-800/50 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Añadir Perfil</span>
          </button>
        )}
      </div>
    </div>
  );
}
