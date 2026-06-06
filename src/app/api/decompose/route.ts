import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Dev fallback — return empty so client uses fallbackDecomposition
    return NextResponse.json({ text: '{"microtasks":[]}' });
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[decompose] Claude API error:', err);
      return NextResponse.json({ text: '{"microtasks":[]}' });
    }

    const data = await res.json();
    const text = data.content
      ?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('') ?? '';

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[decompose] fetch error:', err);
    return NextResponse.json({ text: '{"microtasks":[]}' });
  }
}
