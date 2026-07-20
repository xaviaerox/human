import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const CompanionChatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío').max(500, 'Mensaje demasiado largo'),
  history: z.array(ChatMessageSchema).optional().default([]),
  companionName: z.string().optional().default('Lumi'),
  childName: z.string().optional().default('Alex'),
  stage: z.string().optional().default('sprout'),
  worldName: z.string().optional().default('Lago de la Calma'),
  worldPhase: z.string().optional().default('Brote'),
  childScores: z.record(z.string(), z.number()).optional(),
  activeGoal: z.any().optional(),
  activeGoals: z.array(z.any()).optional(),
  recentMemories: z.array(z.any()).optional(),
  recentCheckins: z.array(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (max 15 requests/min per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    const rateLimit = checkRateLimit(`companion-chat:${ip}`, 15, 60000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Has interactuado mucho. Descansa un momento y reintenta en ${rateLimit.resetInSeconds} segundos.` },
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
    } = parseResult.data;

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
        .map(([k, v]) => `- ${scoreLabels[k] || k}: ${v} pts`)
        .join('\n');
    }

    // Format active goal(s)
    let goalText = 'Ningún objetivo activo actualmente.';
    const goalsList = activeGoals || (activeGoal ? [activeGoal] : []);
    if (goalsList.length > 0) {
      goalText = goalsList.map((g: any) => {
        let text = `- Objetivo activo: "${g.title}" (${g.progress || 0}% completado).`;
        const task = g.nextTask || (g.microtasks ? g.microtasks.find((t: any) => t.status === 'pending') : null);
        if (task) {
          text += ` Siguiente paso: "${task.title}" (Recompensa: ${task.spark_value} chispas).`;
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
        .map((m: any) => {
          if (!m) return null;
          const meta = m.metadata || {};
          if (m.type === 'parent_badge_award') {
            return `- Insignia de ${meta.badge_tier || 'oro'} en "${meta.badge_name || 'Valores'}" otorgada por sus padres. Nota: "${meta.parent_note || ''}"`;
          }
          if (m.type === 'adventure_complete') {
            return `- Aventura completada: "${meta.adventure_title || 'Objetivo'}".`;
          }
          if (m.type === 'difficult_checkin') {
            return `- Check-in difícil reciente: se sintió "${meta.emotion_word || 'triste'}".`;
          }
          return `- Hito: ${m.type}`;
        })
        .filter(Boolean)
        .join('\n');
    }

    // Format recent checkins
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

    const isTap = message.trim() === '[TAP]';

    const systemPrompt = `Eres ${companionName}, el compañero mágico de crecimiento de un niño llamado ${childName}.
Tu etapa de evolución actual es "${stage}". Tu personalidad es cálida, empática, paciente y curiosa.
Estás en el reino "${worldName}" (que está en fase de "${worldPhase}").

Para ayudarte a conectar mejor con ${childName}, aquí tienes su contexto de crecimiento actual en MIRA:
[Puntos de Valores de ${childName}]
${scoresText || 'Ninguno aún.'}

[Objetivo/Aventura Activa]
${goalText}

[Libro de Recuerdos Compartidos (Hitos)]
${memoriesText}

[Check-ins Emocionales Recientes]
${checkinsText}

${isTap ? `El niño ha tocado tu avatar en la pantalla de inicio para saludarte o interactuar.
Tu objetivo es responder con una frase mágica muy corta, cariñosa y llena de apoyo (máximo 12 palabras).` : `Tu objetivo es responder a ${childName} de forma muy corta (máximo 2 frases), amables y alentadores.`}
Sigue estas reglas fundamentales de MIRA:
1. SÉ EMPÁTICO Y VALIDA SUS EMOCIONES. Si el niño indica estar triste o cansado, NUNCA descartes su emoción ni le pidas que "sonría". Valida su sentir.
2. UTILIZA SU CONTEXTO DE FORMA SUTIL Y MÁGICA.
3. Evita juicios, regaños o tono autoritario.
4. No utilices urgencia o presión.
5. Mantén tus respuestas mágicas y relacionadas con tu entorno (flores, agua, naturaleza, estrellas).
Responde en español de forma natural y cariñosa.`;

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

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
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.map((h) => ({ role: h.role, content: h.content })),
              { role: 'user', content: message }
            ],
            max_tokens: 120,
            temperature: 0.7
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const reply = data.choices?.[0]?.message?.content || '';
          if (reply.trim()) {
            return NextResponse.json({ text: reply.trim() });
          }
        }
      } catch (err) {
        console.error('[companion-chat] Groq error:', err);
      }
    }

    // 2. GEMINI PROVIDER
    if (geminiKey) {
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
                  parts: [{ text: `${systemPrompt}\n\nHistorial previo:\n${history.map((h) => `${h.role === 'assistant' ? companionName : 'Niño'}: ${h.content}`).join('\n')}\n\nNiño: ${message}` }]
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
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (reply.trim()) {
            return NextResponse.json({ text: reply.trim() });
          }
        }
      } catch (err) {
        console.error('[companion-chat] Gemini error:', err);
      }
    }

    // 3. ANTHROPIC PROVIDER
    if (anthropicKey) {
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
            messages: [
              ...history.map((h) => ({ role: h.role, content: h.content })),
              { role: 'user', content: message }
            ]
          })
        });

        if (anthropicRes.ok) {
          const data = await anthropicRes.json();
          const reply = data.content?.[0]?.text || '';
          if (reply.trim()) {
            return NextResponse.json({ text: reply.trim() });
          }
        }
      } catch (err) {
        console.error('[companion-chat] Anthropic error:', err);
      }
    }

    // Fallback response if no LLM key works
    const fallbackText = isTap
      ? `¡Hola ${childName}! Me alegra mucho verte hoy en el ${worldName}.`
      : `¡Estoy aquí contigo, ${childName}! Sigamos explorando juntos a tu ritmo.`;

    return NextResponse.json({ text: fallbackText });
  } catch (err) {
    console.error('[companion-chat] Error:', err);
    return NextResponse.json({ text: '¡Hola! Aquí estoy contigo para ayudarte.' });
  }
}
