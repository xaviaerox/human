import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

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
          const text = data.choices?.[0]?.message?.content || '';
          return NextResponse.json({ text });
        } else {
          console.error('[decompose] Groq API error:', await res.text());
        }
      } catch (err) {
        console.error('[decompose] Groq fetch error:', err);
      }
    }

    // Fallback to Gemini if groqKey is missing or fails
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
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return NextResponse.json({ text });
        } else {
          console.error('[decompose] Gemini API error:', await res.text());
        }
      } catch (err) {
        console.error('[decompose] Gemini fetch error:', err);
      }
    }

    // If no API key or both failed, return empty JSON so client falls back
    return NextResponse.json({ text: '{"microtasks":[]}' });
  } catch (err) {
    console.error('[decompose] General error:', err);
    return NextResponse.json({ text: '{"microtasks":[]}' });
  }
}
