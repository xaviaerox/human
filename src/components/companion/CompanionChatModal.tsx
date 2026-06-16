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
      const payload = {
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
      };

      let reply = '';
      let fetchSuccess = false;

      try {
        const res = await fetch('/human/api/companion/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          reply = data.text;
          fetchSuccess = true;
        }
      } catch (fetchErr) {
        console.warn('[CompanionChatModal] API route fetch failed, trying client fallback...', fetchErr);
      }

      if (!fetchSuccess) {
        // Build the system prompt for client-side execution
        let scoresText = '';
        if (childScores) {
          const scoreLabels: Record<string, string> = {
            autonomy: 'Autonomía',
            empathy: 'Empatía',
            regulation: 'Regulación Emocional',
            connection: 'Constancia',
            courage: 'Valentía',
            curiosity: 'Creatividad'
          };
          scoresText = Object.entries(childScores)
            .map(([k, v]) => `- ${scoreLabels[k] || k}: ${v} pts`)
            .join('\n');
        }

        let goalText = 'Ningún objetivo activo actualmente.';
        if (activeGoal) {
          goalText = `Objetivo activo: "${activeGoal.title}" (${activeGoal.progress}% completado).`;
          if (nextTask) {
            goalText += ` Siguiente paso: "${nextTask.title}" (Recompensa: ${nextTask.spark_value} chispas).`;
          }
        }

        let memoriesText = 'No hay recuerdos destacados todavía.';
        const memoriesList = recentMemories || [];
        if (memoriesList.length > 0) {
          memoriesText = memoriesList
            .map((m: any) => {
              if (!m) return null;
              const meta = m.metadata || {};
              if (m.memory_type === 'parent_badge_award') {
                return `- Insignia de ${meta.badge_tier || 'oro'} en "${meta.badge_name || 'Valores'}" otorgada por sus padres.`;
              }
              if (m.memory_type === 'adventure_complete') {
                return `- Aventura completada: "${meta.adventure_title || 'Objetivo'}".`;
              }
              if (m.memory_type === 'difficult_checkin') {
                return `- Check-in difícil reciente: se sintió "${meta.emotion_word || 'triste'}" (valencia: ${meta.valence || 1}, energía: ${meta.energy_level || 1}).`;
              }
              return `- Hito: ${m.memory_type}`;
            })
            .filter(Boolean)
            .join('\n');
        }

        let checkinsText = 'No hay check-ins recientes.';
        const checkinsList = recentCheckins || [];
        if (checkinsList.length > 0) {
          checkinsText = checkinsList
            .map((c: any) => {
              if (!c) return null;
              return `- Se sintió "${c.emotion_word || 'neutral'}" (valencia: ${c.valence || 3}/5, energía: ${c.energy_level || 3}/5)${c.note ? `, nota: "${c.note}"` : ''}`;
            })
            .filter(Boolean)
            .join('\n');
        }

        const systemPrompt = `Eres ${display.name}, el compañero mágico de crecimiento de un niño llamado ${childName}.
Tu etapa de evolución actual es "${display.stage}". Tu personalidad es cálida, empática, paciente y curiosa.
Estás en el reino "${selectedWorldName}" (que está en fase de "${activeWorldPhaseLabel}").

Para ayudarte a conectar mejor con ${childName}, aquí tienes su contexto de crecimiento actual en MIRA:
[Puntos de Valores de ${childName}]
${scoresText || 'Ninguno aún.'}

[Objetivo/Aventura Activa]
${goalText}

[Libro de Recuerdos Compartidos (Hitos)]
${memoriesText}

[Check-ins Emocionales Recientes]
${checkinsText}

Tu objetivo es responder a ${childName} de forma muy corta (máximo 2 frases), amables y alentadores.
Sigue estas reglas fundamentales de MIRA:
1. SÉ EMPÁTICO Y VALIDA SUS EMOCIONES. Si el niño te dice o ha indicado recientemente que está triste, cansado o frustrado, NUNCA descartes su emoción ni le pidas directamente que se alegre ("no estés triste" o "sonríe"). Valida su sentir: "Lamento que te sientas así", "Está bien estar cansado", "Aquí estoy contigo".
2. UTILIZA SU CONTEXTO DE FORMA SUTIL Y MÁGICA. Si acaba de completar un paso de su objetivo, o ha ganado una insignia, o ha tenido un check-in difícil, puedes hacer una referencia sutil y cariñosa (por ejemplo: "¡Qué gran esfuerzo con tu aventura de bici!" o "Vi que te sentías un poco triste, recuerda que aquí en el ${selectedWorldName} siempre puedes descansar conmigo"). Pero no seas un robot que lee datos; sé un amigo mágico.
3. Evita juicios, regaños o tono autoritario.
4. No utilices urgencia o presión ("¡rápido!", "¡debes hacer esto ya!").
5. Mantén tus respuestas mágicas y relacionadas con tu entorno (flores, agua, naturaleza, estrellas).
Responde en español de forma natural y cariñosa. No uses lenguaje de adulto complejo, sé cercano.`;

        const clientGroqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        const clientGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (clientGroqKey) {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientGroqKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.slice(-8).map((h: any) => ({ role: h.role, content: h.content })),
                { role: 'user', content: userText }
              ],
              max_tokens: 120,
              temperature: 0.7
            })
          });
          if (groqRes.ok) {
            const data = await groqRes.json();
            reply = data.choices?.[0]?.message?.content || '';
          }
        } else if (clientGeminiKey) {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientGeminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\nHistorial previo:\n${messages.slice(-8).map((h: any) => `${h.role === 'assistant' ? display.name : 'Niño'}: ${h.content}`).join('\n')}\n\nNiño: ${userText}` }]
                  }
                ],
                generationConfig: {
                  maxOutputTokens: 120,
                  temperature: 0.7
                }
              })
            }
          );
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        }

        if (!reply) {
          // Smart warm local fallback when all APIs fail
          const inputClean = userText.toLowerCase();
          reply = 'Aquí estoy contigo, acompañándote. Crecemos juntos paso a paso.';

          if (inputClean.includes('triste') || inputClean.includes('llorar') || inputClean.includes('mal') || inputClean.includes('asustado') || inputClean.includes('miedo')) {
            reply = `Lamento mucho escuchar eso. Los sentimientos difíciles también son importantes y está bien sentirse así. Yo estoy aquí a tu lado para acompañarte.`;
          } else if (inputClean.includes('enfadado') || inputClean.includes('rabia') || inputClean.includes('molesto') || inputClean.includes('odio')) {
            reply = `Entiendo que sientas rabia ahora mismo. A veces las cosas son frustrantes. Tómate el tiempo que necesites, yo aquí me quedo contigo en calma.`;
          } else if (inputClean.includes('hola') || inputClean.includes('buenos dias') || inputClean.includes('hola!')) {
            reply = `¡Hola! Me alegra mucho saludarte. Estaba esperando por ti para ver cómo va tu día.`;
          } else if (inputClean.includes('jugar') || inputClean.includes('feliz') || inputClean.includes('alegre') || inputClean.includes('divertido')) {
            reply = `¡Qué alegría! Sentir esa energía y compartir risas es maravilloso. ¡Me hace muy feliz verte brillar!`;
          } else if (inputClean.includes('cansado') || inputClean.includes('sueño') || inputClean.includes('dormir')) {
            reply = `Parece que ha sido un día largo. Descansar es muy importante para recuperar tu energía. Puedes recostarte y relajarte.`;
          } else if (inputClean.includes('gracias') || inputClean.includes('te quiero') || inputClean.includes('amigo')) {
            reply = `¡De nada! Me encanta ser tu compañero y aprender cosas hermosas juntos cada día.`;
          } else {
            reply = `Qué bonito que me lo cuentes. Te escucho con mucha atención y me alegra mucho estar contigo aquí en el ${selectedWorldName}.`;
          }
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      onInteract(); // Track interaction bonding points
    } catch (err: any) {
      console.error('[CompanionChatModal] error:', err);
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
