'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { MicroStory } from '@/lib/stories/StoryGenerator';

export interface StoryReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: MicroStory | null;
}

export function StoryReaderModal({ isOpen, onClose, story }: StoryReaderModalProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setCurrentChapterIndex(0));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !story) return null;

  const currentChapter = story.chapters[currentChapterIndex];
  const isFirst = currentChapterIndex === 0;
  const isLast = currentChapterIndex === story.chapters.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-reader-modal-title"
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          className="relative w-full max-w-md bg-amber-50/95 dark:bg-stone-900 border border-amber-200 dark:border-stone-800 shadow-2xl rounded-3xl p-6 flex flex-col gap-5 z-10 text-stone-800 dark:text-stone-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h2 id="story-reader-modal-title" className="font-display font-bold text-base text-amber-900 dark:text-amber-300">
                {story.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
              aria-label="Cerrar cuento"
            >
              ✕
            </button>
          </div>

          {/* Chapter Content */}
          {currentChapter && (
            <div className="flex flex-col gap-4 my-2 min-h-[160px] justify-between">
              <h3 className="font-display font-semibold text-sm text-amber-800 dark:text-amber-400">
                {currentChapter.title}
              </h3>
              <p className="font-body text-xs leading-relaxed text-stone-700 dark:text-stone-300 bg-white/60 dark:bg-stone-850/60 p-4 rounded-2xl border border-amber-100 dark:border-stone-800">
                {currentChapter.content}
              </p>
              {isLast && (
                <div className="p-3 bg-amber-100/70 dark:bg-amber-950/40 rounded-2xl text-[11px] font-body text-amber-900 dark:text-amber-200 italic border border-amber-200/50">
                  ✨ {story.moral}
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-stone-800">
            <Button
              variant="secondary"
              size="sm"
              disabled={isFirst}
              onClick={() => setCurrentChapterIndex(prev => Math.max(0, prev - 1))}
              className="rounded-2xl text-xs"
            >
              ← Anterior
            </Button>
            <span className="text-[11px] font-body font-medium text-stone-500">
              {currentChapterIndex + 1} de {story.chapters.length}
            </span>
            {isLast ? (
              <Button
                size="sm"
                onClick={onClose}
                className="rounded-2xl text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Fin 🌙
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCurrentChapterIndex(prev => Math.min(story.chapters.length - 1, prev + 1))}
                className="rounded-2xl text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Siguiente →
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
