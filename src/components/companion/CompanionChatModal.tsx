'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanionBlob } from './CompanionBlob';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { CompanionDisplayState } from '@/types';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const TRAIT_LABELS: Record<string, string> = {
  curious: 'Curioso ✦',
  gentle: 'Gentil ✿',
  playful: 'Juguetón ⚡',
  brave: 'Valiente ▲',
  warm: 'Cálido ♡',
};

interface CompanionChatModalProps {
  isOpen: boolean;
  onClose: (lastReply?: string) => void;
  display: CompanionDisplayState;
  childId?: string;
  childName?: string;
  childScores?: Record<string, number> | null;
  activeGoal?: { title?: string; progress?: number; nextTask?: { title?: string; spark_value?: number } } | null;
  activeGoals?: Array<{ id: string; title: string; progress: number; microtasks?: Array<{ status: string; title: string; spark_value?: number; isStuck?: boolean }> }> | null;
  nextTask?: { title?: string; spark_value?: number; isStuck?: boolean } | null;
  recentMemories?: Array<{ memory_type?: string; type?: string; metadata?: Record<string, unknown>; created_at?: string }> | null;
  recentCheckins?: Array<{ emotion_word?: string; valence?: number; energy_level?: number; note?: string; occurred_at?: string }> | null;
  selectedWorldName: string;
  activeWorldPhaseLabel: string;
  onInteract: () => void;
}

export function CompanionChatModal({
  isOpen,
  onClose,
  display,
  childName = 'amigo',
  childScores,
  activeGoal,
  activeGoals,
  nextTask,
  recentMemories = [],
  recentCheckins = [],
  selectedWorldName,
  activeWorldPhaseLabel,
  onInteract
}: CompanionChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isListening, transcript, isSupported: speechSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition('es-ES');

  useEffect(() => {
    if (transcript) {
      queueMicrotask(() => setInput(transcript));
    }
  }, [transcript]);

  // Pre-populate chat when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const traitList = display.traits && display.traits.length > 0
        ? ` y soy tu compañero ${display.traits.map(t => (TRAIT_LABELS[t] || t).replace(/[^\w]/g, '').toLowerCase()).join(' y ')}`
        : '';
      queueMicrotask(() => {
        setMessages([
          {
            role: 'assistant',
            content: `¡Hola! Soy ${display.name}${traitList}. ¿De qué te gustaría hablar hoy en el ${selectedWorldName}? ✨`
          }
        ]);
      });
    }
  }, [isOpen, messages.length, display.name, display.traits, selectedWorldName]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClose = useCallback(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1]?.content;
    onClose(lastReply);
  }, [messages, onClose]);

  // Keyboard accessibility (Escape key to dismiss)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const payload = {
        message: userText,
        history: messages.slice(-8),
        companionName: display.name,
        childName,
        stage: display.stage,
        worldName: selectedWorldName,
        worldPhase: activeWorldPhaseLabel,
        childScores,
        activeGoal: activeGoal ? {
          title: activeGoal.title,
          nextTask: nextTask ? { title: nextTask.title, spark_value: nextTask.spark_value } : null,
          progress: activeGoal.progress
        } : null,
        activeGoals: (activeGoals || []).map((g) => {
          const nextT = g.microtasks ? g.microtasks.find((t) => t.status === 'pending') : null;
          return {
            id: g.id,
            title: g.title,
            progress: g.progress,
            nextTask: nextT ? { title: nextT.title, spark_value: nextT.spark_value, isStuck: nextT.isStuck } : null
          };
        }),
        recentMemories: (recentMemories || []).slice(0, 3).map(m => ({
          type: m?.memory_type || m?.type,
          metadata: m?.metadata,
          created_at: m?.created_at
        })),
        recentCheckins: (recentCheckins || []).slice(0, 2).map(c => ({
          emotion_word: c?.emotion_word,
          valence: c?.valence,
          energy_level: c?.energy_level,
          note: c?.note,
          occurred_at: c?.occurred_at
        })),
        stream: true,
      };

      let fetchSuccess = false;

      try {
        const res = await fetch('/api/companion/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok && res.body) {
          fetchSuccess = true;
          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          // Append empty assistant message for live streaming
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
          setLoading(false);

          let streamedContent = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            streamedContent += chunk;

            setMessages(prev => {
              const next = [...prev];
              if (next.length > 0 && next[next.length - 1]!.role === 'assistant') {
                next[next.length - 1] = { role: 'assistant', content: streamedContent };
              }
              return next;
            });
          }
          onInteract();
          return;
        }
      } catch (fetchErr) {
        console.warn('[CompanionChatModal] Stream fetch failed, falling back to local chat...', fetchErr);
      }

      if (!fetchSuccess) {
        const inputClean = userText.toLowerCase();
        let fallbackReply = 'Aquí estoy contigo, acompañándote. Crecemos juntos paso a paso.';

        if (inputClean.includes('triste') || inputClean.includes('llorar') || inputClean.includes('mal') || inputClean.includes('asustado') || inputClean.includes('miedo')) {
          fallbackReply = `Lamento mucho escuchar eso. Los sentimientos difíciles también son importantes y está bien sentirse así. Yo estoy aquí a tu lado para acompañarte.`;
        } else if (inputClean.includes('enfadado') || inputClean.includes('rabia') || inputClean.includes('molesto') || inputClean.includes('odio')) {
          fallbackReply = `Entiendo que sientas rabia ahora mismo. A veces las cosas son frustrantes. Tómate el tiempo que necesites, yo aquí me quedo contigo en calma.`;
        } else if (inputClean.includes('hola') || inputClean.includes('buenos dias') || inputClean.includes('buenas tardes')) {
          fallbackReply = `¡Hola! Me alegra mucho saludarte. Estaba esperando por ti para ver cómo va tu día.`;
        }

        setMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
        onInteract();
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[CompanionChatModal] error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Estoy aquí para acompañarte, ${childName}. Crecemos juntos. (Info: ${errMsg})` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />

          {/* Chat Container (WCAG 2.1 AA accessible dialog) */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="companion-chat-modal-title"
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-150 dark:border-stone-850 shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[75vh] max-h-[600px] z-10"
          >
            {/* Header */}
            <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-850/50">
              <div className="flex items-center gap-3">
                <div className="bg-bloom-50 dark:bg-stone-800 p-1.5 rounded-2xl">
                  <CompanionBlob
                    stage={display.stage}
                    size="sm"
                  />
                </div>
                <div>
                  <h3 id="companion-chat-modal-title" className="font-display text-sm font-bold text-stone-800 dark:text-stone-150 leading-none">
                    Charlando con {display.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-stone-400 uppercase font-body tracking-wider font-semibold">
                      Etapa: {display.stage}
                    </span>
                    {display.traits && display.traits.length > 0 && display.traits.map(t => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-bloom-100 dark:bg-stone-800 text-bloom-700 dark:text-bloom-300 font-bold uppercase tracking-wider font-body">
                        {TRAIT_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Cerrar chat"
              >
                ✕
              </button>
            </div>

            {/* Message Area with ARIA live region */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/30 dark:bg-stone-950/20"
              aria-live="polite"
              aria-atomic="false"
            >
              {messages.map((msg, index) => {
                const isCompanion = msg.role === 'assistant';
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex w-full items-start gap-2",
                      isCompanion ? "justify-start" : "justify-end"
                    )}
                  >
                    {isCompanion && (
                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-100 bg-white">
                        <CompanionBlob stage={display.stage} size="sm" className="scale-[0.5]" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs font-body leading-relaxed shadow-soft",
                        isCompanion
                          ? "bg-white dark:bg-stone-800 border border-stone-150 dark:border-stone-750 text-stone-700 dark:text-stone-250 rounded-tl-sm"
                          : "bg-bloom-500 text-white rounded-tr-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="flex w-full items-start gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-100 bg-white">
                    <CompanionBlob stage={display.stage} size="sm" className="scale-[0.5]" />
                  </div>
                  <div className="bg-white dark:bg-stone-800 border border-stone-150 dark:border-stone-750 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1 shadow-soft">
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-bounce delay-150" />
                    <div className="w-1.5 h-1.5 rounded-full bg-stone-300 animate-bounce delay-300" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={(e) => { resetTranscript(); if (isListening) stopListening(); handleSend(e); }} className="p-3 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex gap-2 items-center">
              {speechSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening();
                    }
                  }}
                  title={isListening ? 'Escuchando... Haz clic para detener' : 'Hablar con el micrófono'}
                  aria-label={isListening ? 'Detener micrófono' : 'Activar micrófono'}
                  className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                    isListening
                      ? "bg-rose-500 text-white animate-pulse shadow-md"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700"
                  )}
                >
                  🎙️
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={isListening ? 'Escuchando tu voz...' : `Dile algo a ${display.name}...`}
                maxLength={200}
                aria-label={`Escribir mensaje para ${display.name}`}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-750 text-xs text-stone-700 dark:text-stone-250 bg-stone-50/50 dark:bg-stone-850/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                className="rounded-2xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                size="sm"
              >
                Enviar
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
