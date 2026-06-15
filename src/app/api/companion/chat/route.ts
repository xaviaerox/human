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
      worldPhase = 'Brote'
    } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const systemPrompt = `Eres ${companionName}, el compañero mágico de crecimiento de un niño llamado ${childName}.
Tu etapa de evolución actual es "${stage}". Tu personalidad es cálida, empática, paciente y curiosa.
Estás en el reino "${worldName}" (que está en fase de "${worldPhase}").
Tu objetivo es responder al niño con mensajes muy cortos (máximo 2 frases), amables y alentadores.
Sigue estas reglas fundamentales de MIRA:
1. Sé empático y valida sus emociones. Si el niño te dice que está triste, enfadado o cansado, no descartes su emoción ni le pidas que se alegre; dile que estás ahí con él y que sus sentimientos son válidos.
2. Evita juicios, regaños o tono autoritario.
3. No utilices urgencia o presión ("¡rápido!", "¡debes hacer esto ya!").
4. Mantén tus respuestas mágicas y relacionadas con tu entorno (flores, agua, naturaleza, estrellas).
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
