'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CompanionBlob } from './CompanionBlob';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { CompanionDisplayState } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CompanionChatModalProps {
  isOpen: boolean;
  onClose: (lastReply?: string) => void;
  display: CompanionDisplayState;
  childId?: string;
  childName?: string;
  childScores?: any;
  activeGoal?: any;
  nextTask?: any;
  recentMemories?: any[];
  recentCheckins?: any[];
  selectedWorldName: string;
  activeWorldPhaseLabel: string;
  onInteract: () => void;
}

export function CompanionChatModal({
  isOpen,
  onClose,
  display,
  childId,
  childName = 'amigo',
  childScores,
  activeGoal,
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

  // Pre-populate chat when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `¡Hola! Soy ${display.name}. ¿De qué te gustaría hablar hoy en el ${selectedWorldName}? ✨`
        }
      ]);
    }
  }, [isOpen, messages.length, display.name, selectedWorldName]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-8), // Send context
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
          recentMemories: (recentMemories || []).slice(0, 3).map(m => ({
            type: m?.memory_type,
            metadata: m?.metadata,
            created_at: m?.created_at
          })),
          recentCheckins: (recentCheckins || []).slice(0, 2).map(c => ({
            emotion_word: c?.emotion_word,
            valence: c?.valence,
            energy_level: c?.energy_level,
            note: c?.note,
            occurred_at: c?.occurred_at
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
        onInteract(); // Track interaction bonding points
      } else {
        throw new Error('Chat API returned error status');
      }
    } catch (err: any) {
      console.error('[CompanionChatModal] fetch error:', err);
      // Friendly fallback with debug info
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Estoy aquí para acompañarte, ${childName}. Crecemos juntos. (Error: ${err?.message || String(err)})` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Get last companion reply to set as active dialogue on exit
  function handleClose() {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1]?.content;
    onClose(lastReply);
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

          {/* Chat Container */}
          <motion.div
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
                  <h3 className="font-display text-sm font-bold text-stone-800 dark:text-stone-150 leading-none">
                    Charlando con {display.name}
                  </h3>
                  <p className="text-[10px] text-stone-400 mt-1 uppercase font-body tracking-wider font-semibold">
                    Etapa: {display.stage}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-sm cursor-pointer transition-colors"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/30 dark:bg-stone-950/20">
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
            <form onSubmit={handleSend} className="p-3 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Dile algo a ${display.name}...`}
                maxLength={200}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 dark:border-stone-750 text-xs text-stone-700 dark:text-stone-250 bg-stone-50/50 dark:bg-stone-850/50 focus:outline-none focus:ring-2 focus:ring-bloom-200"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                className="rounded-2xl px-4 py-2"
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
