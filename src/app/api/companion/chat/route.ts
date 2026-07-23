import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/RateLimiter';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { sanitizePii, restorePii } from '@/lib/security/PiiSanitizer';

function sanitizePromptText(input?: string): string {
  if (!input) return '';
  return input
    .replace(/[\r\n]+/g, ' ')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 300);
}

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const MicrotaskSchema = z.object({
  title: z.string().optional(),
  status: z.string().optional(),
  spark_value: z.number().optional(),
  isStuck: z.boolean().optional(),
});

const GoalSchema = z.object({
  title: z.string().optional(),
  progress: z.number().optional(),
  nextTask: MicrotaskSchema.optional(),
  microtasks: z.array(MicrotaskSchema).optional(),
});

const MemorySchema = z.object({
  type: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CheckinSchema = z.object({
  emotion_word: z.string().optional(),
  valence: z.number().optional(),
  energy_level: z.number().optional(),
  note: z.string().optional(),
});

const CompanionChatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(500, 'Mensaje demasiado largo'),
  history: z.array(ChatMessageSchema).optional().default([]),
  companionName: z.string().optional().default('Lumi'),
  childName: z.string().optional().default('Alex'),
  stage: z.string().optional().default('sprout'),
  worldName: z.string().optional().default('Lago de la Calma'),
  worldPhase: z.string().optional().default('Brote'),
  childScores: z.record(z.string(), z.number()).nullable().optional(),
  activeGoal: GoalSchema.nullable().optional(),
  activeGoals: z.array(GoalSchema).nullable().optional(),
  recentMemories: z.array(MemorySchema).nullable().optional(),
  recentCheckins: z.array(CheckinSchema).nullable().optional(),
  stream: z.boolean().optional().default(false),
});

// ─────────────────────────────────────────────────────────────────────────────
// STREAMING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a single SSE data line and extracts the text delta.
 * Handles OpenAI-compatible format (Groq, OpenAI) and Anthropic format.
 */
function parseOpenAIChunk(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const data = line.slice(6).trim();
  if (data === '[DONE]') return '';
  try {
    const json = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return json.choices?.[0]?.delta?.content ?? '';
  } catch {
    return '';
  }
}

function parseAnthropicChunk(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const data = line.slice(6).trim();
  try {
    const json = JSON.parse(data) as {
      type?: string;
      delta?: { type?: string; text?: string };
    };
    if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
      return json.delta.text ?? '';
    }
    return '';
  } catch {
    return '';
  }
}

function parseGeminiChunk(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const data = line.slice(6).trim();
  try {
    const json = JSON.parse(data) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch {
    return '';
  }
}

/**
 * Creates a ReadableStream that proxies an LLM SSE response to the client,
 * extracting text deltas using the provided parser function.
 * Also restores PII after reading the full text.
 */
function createLLMProxyStream(
  llmResponse: Response,
  parseChunk: (line: string) => string,
  piiReplacements: Record<string, string>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      if (!llmResponse.body) {
        controller.close();
        return;
      }

      const reader = llmResponse.body.getReader();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const text = parseChunk(line.trim());
            if (text) {
              // Restore PII in each delta chunk
              const restored = restorePii(text, piiReplacements);
              controller.enqueue(encoder.encode(restored));
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const text = parseChunk(buffer.trim());
          if (text) {
            controller.enqueue(encoder.encode(restorePii(text, piiReplacements)));
          }
        }
      } catch (err) {
        console.error('[companion-chat] Stream proxy error:', err);
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });
}

function streamResponse(stream: ReadableStream<Uint8Array>): NextResponse {
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (max 15 requests/min per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    const rateLimit = await checkRateLimit(`companion-chat:${ip}`, 15, 60000);

    if (!rateLimit.success) {
      const resetSec = Math.ceil((rateLimit.resetMs - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Has interactuado mucho. Descansa un momento y reintenta en ${resetSec} segundos.` },
        { status: 429 }
      );
    }

    // 2. Auth check in Supabase mode
    if (process.env.NEXT_PUBLIC_DATA_SOURCE === 'supabase') {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    // 3. Zod validation
    const body = await req.json().catch(() => ({}));
    const parseResult = CompanionChatSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Datos no válidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      message,
      history,
      companionName,
      childName,
      stage,
      worldName,
      worldPhase,
      childScores,
      activeGoal,
      activeGoals,
      recentMemories,
      recentCheckins,
      stream,
    } = parseResult.data;

    const safeCompanionName = sanitizePromptText(companionName) || 'Lumi';
    const safeChildName = sanitizePromptText(childName) || 'Alex';
    const safeWorldName = sanitizePromptText(worldName) || 'Lago de la Calma';
    const safeWorldPhase = sanitizePromptText(worldPhase) || 'Brote';
    const safeStage = sanitizePromptText(stage) || 'sprout';

    // Format value scores
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
        .map(([k, v]) => `- ${scoreLabels[k] || sanitizePromptText(k)}: ${Number(v) || 0} pts`)
        .join('\n');
    }

    // Format active goal(s)
    let goalText = 'Ningún objetivo activo actualmente.';
    const goalsList = activeGoals || (activeGoal ? [activeGoal] : []);
    if (goalsList.length > 0) {
      goalText = goalsList.map((g) => {
        const title = sanitizePromptText(g.title || 'Objetivo');
        let text = `- Objetivo activo: "${title}" (${g.progress || 0}% completado).`;
        const task = g.nextTask || (g.microtasks ? g.microtasks.find((t) => t.status === 'pending') : null);
        if (task) {
          const taskTitle = sanitizePromptText(task.title || 'Paso');
          text += ` Siguiente paso: "${taskTitle}" (Recompensa: ${task.spark_value || 1} chispas).`;
          if (task.isStuck) {
            text += ` Nota: El niño lleva más de 48 horas sin completar este paso. Dale apoyo específico.`;
          }
        }
        return text;
      }).join('\n');
    }

    // Format recent memories
    let memoriesText = 'No hay recuerdos destacados todavía.';
    const memoriesList = recentMemories || [];
    if (memoriesList.length > 0) {
      memoriesText = memoriesList
        .map((m) => {
          if (!m) return null;
          const meta = m.metadata || {};
          if (m.type === 'parent_badge_award') {
            const badgeTier = sanitizePromptText(String(meta.badge_tier || 'oro'));
            const badgeName = sanitizePromptText(String(meta.badge_name || 'Valores'));
            const parentNote = sanitizePromptText(String(meta.parent_note || ''));
            return `- Insignia de ${badgeTier} en "${badgeName}" otorgada por sus padres. Nota: "${parentNote}"`;
          }
          if (m.type === 'adventure_complete') {
            const advTitle = sanitizePromptText(String(meta.adventure_title || 'Objetivo'));
            return `- Aventura completada: "${advTitle}".`;
          }
          if (m.type === 'difficult_checkin') {
            const emotionWord = sanitizePromptText(String(meta.emotion_word || 'triste'));
            return `- Check-in difícil reciente: se sintió "${emotionWord}".`;
          }
          return `- Hito: ${sanitizePromptText(m.type || 'Hito')}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    // Format recent checkins
    let checkinsText = 'No hay check-ins recientes.';
    const checkinsList = recentCheckins || [];
    if (checkinsList.length > 0) {
      checkinsText = checkinsList
        .map((c) => {
          if (!c) return null;
          const emotion = sanitizePromptText(c.emotion_word || 'neutral');
          const note = sanitizePromptText(c.note || '');
          return `- Se sintió "${emotion}" (valencia: ${c.valence || 3}/5, energía: ${c.energy_level || 3}/5)${note ? `, nota: "${note}"` : ''}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    const isTap = message.trim() === '[TAP]';
    const cleanUserMsg = sanitizePromptText(message);

    const rawSystemPrompt = `Eres ${safeCompanionName}, el compañero mágico de crecimiento de un niño llamado ${safeChildName}.
Tu etapa de evolución actual es "${safeStage}". Tu personalidad es cálida, empática, paciente y curiosa.
Estás en el reino "${safeWorldName}" (que está en fase de "${safeWorldPhase}").

Para ayudarte a conectar mejor con ${safeChildName}, aquí tienes su contexto de crecimiento actual en MIRA:
[Puntos de Valores de ${safeChildName}]
${scoresText || 'Ninguno aún.'}

[Objetivo/Aventura Activa]
${goalText}

[Libro de Recuerdos Compartidos (Hitos)]
${memoriesText}

[Check-ins Emocionales Recientes]
${checkinsText}

${isTap ? `El niño ha tocado tu avatar en la pantalla de inicio para saludarte o interactuar.
Tu objetivo es responder con una frase mágica muy corta, cariñosa y llena de apoyo (máximo 12 palabras).` : `Tu objetivo es responder a ${safeChildName} de forma muy corta (máximo 2 frases), amables y alentadores.`}
Sigue estas reglas fundamentales de MIRA:
1. SÉ EMPÁTICO Y VALIDA SUS EMOCIONES. Si el niño indica estar triste o cansado, NUNCA descartes su emoción ni le pidas que "sonría". Valida su sentir.
2. UTILIZA SU CONTEXTO DE FORMA SUTIL Y MÁGICA.
3. Evita juicios, regaños o tono autoritario.
4. No utilices urgencia o presión.
5. Mantén tus respuestas mágicas y relacionadas con tu entorno (flores, agua, naturaleza, estrellas).
Responde en español de forma natural y cariñosa.`;

    const piiSanitization = sanitizePii(rawSystemPrompt, safeChildName);
    const systemPrompt = piiSanitization.sanitizedText;
    const piiReplacements = piiSanitization.replacements;

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    const messagesPayload = [
      ...history.map((h) => ({ role: h.role, content: sanitizePromptText(h.content) })),
      { role: 'user' as const, content: cleanUserMsg },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // STREAMING PATH: pipe LLM tokens directly to client
    // ─────────────────────────────────────────────────────────────────────────
    if (stream) {
      // 1. GROQ STREAMING (OpenAI-compatible SSE)
      if (groqKey) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'system', content: systemPrompt }, ...messagesPayload],
              max_tokens: 120,
              temperature: 0.7,
              stream: true,
            }),
          });

          if (groqRes.ok && groqRes.body) {
            return streamResponse(createLLMProxyStream(groqRes, parseOpenAIChunk, piiReplacements));
          }
        } catch (err) {
          console.error('[companion-chat] Groq stream error:', err);
        }
      }

      // 2. GEMINI STREAMING (SSE via ?alt=sse)
      if (geminiKey) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    role: 'user',
                    parts: [{
                      text: `${systemPrompt}\n\nHistorial previo:\n${history.map((h) => `${h.role === 'assistant' ? safeCompanionName : 'Niño'}: ${sanitizePromptText(h.content)}`).join('\n')}\n\nNiño: ${cleanUserMsg}`
                    }]
                  }
                ],
                generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
              }),
            }
          );

          if (geminiRes.ok && geminiRes.body) {
            return streamResponse(createLLMProxyStream(geminiRes, parseGeminiChunk, piiReplacements));
          }
        } catch (err) {
          console.error('[companion-chat] Gemini stream error:', err);
        }
      }

      // 3. ANTHROPIC STREAMING
      if (anthropicKey) {
        try {
          const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 120,
              system: systemPrompt,
              messages: messagesPayload,
              stream: true,
            }),
          });

          if (anthropicRes.ok && anthropicRes.body) {
            return streamResponse(createLLMProxyStream(anthropicRes, parseAnthropicChunk, piiReplacements));
          }
        } catch (err) {
          console.error('[companion-chat] Anthropic stream error:', err);
        }
      }

      // Fallback: stream a static message if no LLM key works
      const fallback = isTap
        ? `¡Hola ${safeChildName}! Me alegra mucho verte hoy en el ${safeWorldName}.`
        : `¡Estoy aquí contigo, ${safeChildName}! Sigamos explorando juntos a tu ritmo.`;
      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(fallback));
          controller.close();
        },
      });
      return streamResponse(fallbackStream);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NON-STREAMING PATH (kept for backward compatibility / static mode)
    // ─────────────────────────────────────────────────────────────────────────
    let finalReply = '';

    // 1. GROQ PROVIDER
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'system', content: systemPrompt }, ...messagesPayload],
            max_tokens: 120,
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json() as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const reply = data.choices?.[0]?.message?.content || '';
          if (reply.trim()) finalReply = reply.trim();
        }
      } catch (err) {
        console.error('[companion-chat] Groq error:', err);
      }
    }

    // 2. GEMINI PROVIDER
    if (!finalReply && geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nHistorial previo:\n${history.map((h) => `${h.role === 'assistant' ? safeCompanionName : 'Niño'}: ${sanitizePromptText(h.content)}`).join('\n')}\n\nNiño: ${cleanUserMsg}` }]
                }
              ],
              generationConfig: { maxOutputTokens: 120, temperature: 0.7 }
            })
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json() as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (reply.trim()) finalReply = reply.trim();
        }
      } catch (err) {
        console.error('[companion-chat] Gemini error:', err);
      }
    }

    // 3. ANTHROPIC PROVIDER
    if (!finalReply && anthropicKey) {
      try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 120,
            system: systemPrompt,
            messages: messagesPayload
          })
        });

        if (anthropicRes.ok) {
          const data = await anthropicRes.json() as {
            content?: Array<{ text?: string }>;
          };
          const reply = data.content?.[0]?.text || '';
          if (reply.trim()) finalReply = reply.trim();
        }
      } catch (err) {
        console.error('[companion-chat] Anthropic error:', err);
      }
    }

    // Fallback response if no LLM key works
    if (!finalReply) {
      finalReply = isTap
        ? `¡Hola ${safeChildName}! Me alegra mucho verte hoy en el ${safeWorldName}.`
        : `¡Estoy aquí contigo, ${safeChildName}! Sigamos explorando juntos a tu ritmo.`;
    } else {
      finalReply = restorePii(finalReply, piiReplacements);
    }

    return NextResponse.json({ text: finalReply });
  } catch (err) {
    console.error('[companion-chat] Error:', err);
    return NextResponse.json({ text: '¡Hola! Aquí estoy contigo para ayudarte.' });
  }
}
