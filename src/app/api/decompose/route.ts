import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/security/RateLimiter';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

import { sanitizePii, restorePii } from '@/lib/security/PiiSanitizer';

const DecomposeSchema = z.object({
  prompt: z.string().min(1, 'El prompt no puede estar vacío').max(1000, 'Prompt demasiado largo'),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting (max 10 requests/min per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    const rateLimit = await checkRateLimit(`decompose:${ip}`, 10, 60000);

    if (!rateLimit.success) {
      const resetInSeconds = Math.ceil((rateLimit.resetMs - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Demasiadas peticiones. Intenta de nuevo en ${resetInSeconds} segundos.` },
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
    const parseResult = DecomposeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Datos no válidos', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt: rawPrompt } = parseResult.data;
    const { sanitizedText: prompt, replacements: piiReplacements } = sanitizePii(rawPrompt);

    // 4. Call Groq
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1024,
            temperature: 0.3,
            response_format: { type: 'json_object' }
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data.choices?.[0]?.message?.content || '';
          const text = restorePii(rawText, piiReplacements);
          return NextResponse.json({ text });
        } else {
          console.error('[decompose] Groq API error:', await res.text());
        }
      } catch (err) {
        console.error('[decompose] Groq fetch error:', err);
      }
    }

    // 5. Fallback to Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.3,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const text = restorePii(rawText, piiReplacements);
          return NextResponse.json({ text });
        } else {
          console.error('[decompose] Gemini API error:', await res.text());
        }
      } catch (err) {
        console.error('[decompose] Gemini fetch error:', err);
      }
    }

    // 6. Safe fallback JSON
    return NextResponse.json({ text: '{"microtasks":[]}' });
  } catch (err) {
    console.error('[decompose] General error:', err);
    return NextResponse.json({ text: '{"microtasks":[]}' });
  }
}
