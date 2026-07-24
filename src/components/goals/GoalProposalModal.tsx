'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Wand2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface GoalProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (val: string) => void;
  why: string;
  setWhy: (val: string) => void;
  step1: string;
  setStep1: (val: string) => void;
  step2: string;
  setStep2: (val: string) => void;
  step3: string;
  setStep3: (val: string) => void;
  submitting: boolean;
  error: string;
  isGeneratingAI: boolean;
  onAIDecompose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function GoalProposalModal({
  isOpen,
  onClose,
  title,
  setTitle,
  why,
  setWhy,
  step1,
  setStep1,
  step2,
  setStep2,
  step3,
  setStep3,
  submitting,
  error,
  isGeneratingAI,
  onAIDecompose,
  onSubmit,
}: GoalProposalModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl border border-amber-500/20 bg-slate-900 p-6 sm:p-8 text-slate-100 shadow-2xl overflow-hidden max-h-[90dvh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-amber-100 bg-clip-text text-transparent">
              Sugerir una Nueva Aventura / Meta
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Describe lo que te gustaría lograr. ¡Puedes usar la IA para sugerir micropasos!
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ¿Qué te gustaría lograr? (Título)
              </label>
              <div className="flex gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Aprender a montar en bici o ordenar mis juguetes"
                  required
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  type="button"
                  onClick={onAIDecompose}
                  disabled={!title.trim() || isGeneratingAI}
                  className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 whitespace-nowrap text-xs flex items-center gap-1"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {isGeneratingAI ? 'Generando...' : 'Desintegrar IA'}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ¿Por qué es importante para ti? (Opcional)
              </label>
              <Input
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="Ej: Porque me divertiré mucho y me sentiré orgulloso/a"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-amber-300">
                Pasos de la Aventura (Microtareas)
              </label>
              <Input
                value={step1}
                onChange={(e) => setStep1(e.target.value)}
                placeholder="Paso 1: Primer paso pequeñito"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
              <Input
                value={step2}
                onChange={(e) => setStep2(e.target.value)}
                placeholder="Paso 2: Seguir practicando"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
              <Input
                value={step3}
                onChange={(e) => setStep3(e.target.value)}
                placeholder="Paso 3: ¡Logro completado!"
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}

            <div className="pt-4 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="flex-1 border border-slate-700 text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={submitting}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                <Plus className="h-4 w-4 mr-1" />
                Enviar Sugerencia
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
