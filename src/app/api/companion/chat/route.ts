import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      history = [],
      companionName = 'Lumi',
      childName = 'Alex',
      stage = 'sprout',
      worldName = 'Lago de la Calma',
      worldPhase = 'Brote',
      childScores,
      activeGoal,
      recentMemories = [],
      recentCheckins = []
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

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

    // Format active goal
    let goalText = 'Ningún objetivo activo actualmente.';
    if (activeGoal) {
      goalText = `Objetivo activo: "${activeGoal.title}" (${activeGoal.progress}% completado).`;
      if (activeGoal.nextTask) {
        goalText += ` Siguiente paso: "${activeGoal.nextTask.title}" (Recompensa: ${activeGoal.nextTask.spark_value} chispas).`;
      }
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
            return `- Insignia de ${meta.badge_tier || 'oro'} en "${meta.badge_name || 'Valores'}" otorgada por sus padres.`;
          }
          if (m.type === 'adventure_complete') {
            return `- Aventura completada: "${meta.adventure_title || 'Objetivo'}".`;
          }
          if (m.type === 'difficult_checkin') {
            return `- Check-in difícil reciente: se sintió "${meta.emotion_word || 'triste'}" (valencia: ${meta.valence || 1}, energía: ${meta.energy_level || 1}).`;
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

Tu objetivo es responder a ${childName} de forma muy corta (máximo 2 frases), amables y alentadores.
Sigue estas reglas fundamentales de MIRA:
1. SÉ EMPÁTICO Y VALIDA SUS EMOCIONES. Si el niño te dice o ha indicado recientemente que está triste, cansado o frustrado, NUNCA descartes su emoción ni le pidas directamente que se alegre ("no estés triste" o "sonríe"). Valida su sentir: "Lamento que te sientas así", "Está bien estar cansado", "Aquí estoy contigo".
2. UTILIZA SU CONTEXTO DE FORMA SUTIL Y MÁGICA. Si acaba de completar un paso de su objetivo, o ha ganado una insignia, o ha tenido un check-in difícil, puedes hacer una referencia sutil y cariñosa (por ejemplo: "¡Qué gran esfuerzo con tu aventura de bici!" o "Vi que te sentías un poco triste, recuerda que aquí en el ${worldName} siempre puedes descansar conmigo"). Pero no seas un robot que lee datos; sé un amigo mágico.
3. Evita juicios, regaños o tono autoritario.
4. No utilices urgencia o presión ("¡rápido!", "¡debes hacer esto ya!").
5. Mantén tus respuestas mágicas y relacionadas con tu entorno (flores, agua, naturaleza, estrellas).
Responde en español de forma natural y cariñosa. No uses lenguaje de adulto complejo, sé cercano.`;

    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // ─────────────────────────────────────────
    // 1. GROQ PROVIDER
    // ─────────────────────────────────────────
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
              ...history.map((h: any) => ({ role: h.role, content: h.content })),
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
        } else {
          console.error('[companion-chat] Groq API failed:', await groqRes.text());
        }
      } catch (err) {
        console.error('[companion-chat] Groq error:', err);
      }
    }

    // ─────────────────────────────────────────
    // 2. GEMINI PROVIDER
    // ─────────────────────────────────────────
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
                  parts: [{ text: `${systemPrompt}\n\nHistorial previo:\n${history.map((h: any) => `${h.role === 'assistant' ? companionName : 'Niño'}: ${h.content}`).join('\n')}\n\nNiño: ${message}` }]
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
        } else {
          console.error('[companion-chat] Gemini API failed:', await geminiRes.text());
        }
      } catch (err) {
        console.error('[companion-chat] Gemini error:', err);
      }
    }

    // ─────────────────────────────────────────
    // 3. ANTHROPIC CLAUDE PROVIDER
    // ─────────────────────────────────────────
    if (anthropicKey && anthropicKey !== 'tu-key-de-claude-si-aplica') {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 120,
            system: systemPrompt,
            messages: [
              ...history.map((h: any) => ({ role: h.role, content: h.content })),
              { role: 'user', content: message }
            ],
            temperature: 0.7
          })
        });

        if (claudeRes.ok) {
          const data = await claudeRes.json();
          const reply = data.content?.[0]?.text || '';
          if (reply.trim()) {
            return NextResponse.json({ text: reply.trim() });
          }
        } else {
          console.error('[companion-chat] Claude API failed:', await claudeRes.text());
        }
      } catch (err) {
        console.error('[companion-chat] Claude error:', err);
      }
    }

    // ─────────────────────────────────────────
    // 4. SMART WARM LOCAL FALLBACK
    // ─────────────────────────────────────────
    const inputClean = message.toLowerCase();
    let reply = 'Aquí estoy contigo, acompañándote. Crecemos juntos paso a paso.';

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
      reply = `Qué bonito que me lo cuentes. Te escucho con mucha atención y me alegra mucho estar contigo aquí en el ${worldName}.`;
    }

    return NextResponse.json({ text: reply });
  } catch (error: any) {
    console.error('[companion-chat] General error:', error);
    return NextResponse.json({ text: 'Aquí estoy contigo. Sigue adelante.' });
  }
}
