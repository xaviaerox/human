import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function sanitizePii(text: string): { sanitized: string; replacements: Record<string, string> } {
  const replacements: Record<string, string> = {};
  let count = 0;

  let sanitized = text.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    (match) => {
      const token = `[EMAIL_${++count}]`;
      replacements[token] = match;
      return token;
    }
  );

  sanitized = sanitized.replace(
    /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
    (match) => {
      if (match.length >= 8) {
        const token = `[PHONE_${++count}]`;
        replacements[token] = match;
        return token;
      }
      return match;
    }
  );

  return { sanitized, replacements };
}

function restorePii(text: string, replacements: Record<string, string>): string {
  let restored = text;
  for (const [token, original] of Object.entries(replacements)) {
    restored = restored.replaceAll(token, original);
  }
  return restored;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, companionName = 'Lumi', childName = 'Alex', stage = 'sprout', worldName = 'Lago de la Calma' } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El mensaje es obligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sanitized, replacements } = sanitizePii(message);

    const systemPrompt = `Eres ${companionName}, un compañero mágico y empático para ${childName} en MIRA.
Principios éticos no negociables:
- Sin rachas punitivas ni presión por tiempo.
- Tono afirmativo, calmado, amable y acogedor.
- Respuestas breves (máximo 2-3 frases), aptas para niños neurodivergentes.
- Etapa del compañero: ${stage}. Mundo actual: ${worldName}.`;

    const groqKey = Deno.env.get('GROQ_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (groqKey) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitized },
          ],
          max_tokens: 250,
          temperature: 0.7,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const rawContent = data.choices?.[0]?.message?.content || '¡Hola! Estoy muy feliz de estar aquí contigo hoy. ✨';
        const restored = restorePii(rawContent, replacements);
        return new Response(
          JSON.stringify({ text: restored }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (geminiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nMensaje de ${childName}: ${sanitized}` }],
              },
            ],
          }),
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '✨ ¡Siento una gran luz en nuestro camino!';
        const restored = restorePii(rawContent, replacements);
        return new Response(
          JSON.stringify({ text: restored }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Affirmative Fallback Response
    const fallbackText = restorePii(
      `¡Hola, ${childName}! Me alegra mucho saludarte hoy. En el ${worldName} siempre hay un rincón tranquilo esperando por nosotros. 🌟`,
      replacements
    );

    return new Response(
      JSON.stringify({ text: fallbackText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno en Edge Function' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
