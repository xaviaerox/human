'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, AlertCircle, Lightbulb, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface ChildFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  childId?: string;
  childName?: string;
}

type FeedbackType = 'bug' | 'idea' | 'help';

export function ChildFeedbackModal({ isOpen, onClose, childId, childName = 'amigo' }: ChildFeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>('bug');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSending(true);

    try {
      if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase' && childId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('family_feedback').insert({
          child_id: childId,
          type,
          content: content.trim(),
          status: 'open',
          created_at: new Date().toISOString(),
        });
      } else if (typeof window !== 'undefined') {
        // Local storage fallback for feedback tickets
        const tickets = JSON.parse(localStorage.getItem('mira_child_feedback_tickets') || '[]');
        tickets.push({
          id: Date.now().toString(),
          childId,
          type,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('mira_child_feedback_tickets', JSON.stringify(tickets));
      }

      setSent(true);
      setTimeout(() => {
        setSent(false);
        setContent('');
        onClose();
      }, 1800);
    } catch (err) {
      console.error('[ChildFeedbackModal] Error sending feedback ticket:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-800 rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-full transition-colors cursor-pointer"
            aria-label="Cerrar ventana de comentarios"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1 text-center">
            <div className="inline-flex items-center space-x-1 px-3 py-1 bg-bloom-100 dark:bg-stone-800 rounded-full text-bloom-700 dark:text-bloom-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buzón Mágico de Mira</span>
            </div>
            <h3 id="feedback-modal-title" className="text-lg font-bold text-stone-800 dark:text-stone-100">
              ¿Algo no funciona o tienes una idea?
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Tus palabras ayudan a que Mira sea un lugar mejor para ti, {childName}.
            </p>
          </div>

          {sent ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-8 text-center space-y-2"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h4 className="font-bold text-stone-800 dark:text-stone-100">¡Mensaje recibido! 🚀</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Gracias por ayudarnos a mejorar. ¡Eres genial!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type selection */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    type === 'bug'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>Algo falló 🐞</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('idea')}
                  className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    type === 'idea'
                      ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Tengo una idea 💡</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('help')}
                  className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    type === 'help'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Heart className="w-4 h-4 text-indigo-500" />
                  <span>Pedir ayuda ❤️</span>
                </button>
              </div>

              {/* Text input */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === 'bug'
                    ? 'Cuéntanos qué pasó o qué botón no funcionó bien...'
                    : type === 'idea'
                    ? '¿Qué te gustaría ver en Mira o qué idea se te ocurrió?'
                    : 'Escribe un mensaje para que tus padres o tutores lo revisen...'
                }
                rows={4}
                maxLength={400}
                required
                className="w-full p-3 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-850 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-500 resize-none"
              />

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  className="flex-1 rounded-2xl text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!content.trim() || sending}
                  className="flex-1 rounded-2xl text-xs bg-bloom-600 hover:bg-bloom-700 text-white flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? 'Enviando...' : 'Enviar ticket 🚀'}</span>
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
