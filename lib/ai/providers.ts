// Raw REST calls, deliberately no SDK dependency (@anthropic-ai/sdk / openai /
// @google/generative-ai) — this app only needs one text-in/text-out call, so
// adding a full SDK per provider isn't worth the dependency weight.

export type AiProvider = 'anthropic' | 'openai' | 'gemini';

function detectProvider(): AiProvider | null {
  const explicit = process.env.AI_PROVIDER as AiProvider | undefined;
  if (explicit && ['anthropic', 'openai', 'gemini'].includes(explicit)) {
    return explicit;
  }
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return null;
}

export function isAiConfigured(): boolean {
  return detectProvider() !== null;
}

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}

async function callOpenAi(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGemini(prompt: string): Promise<string> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

export async function callAiProvider(prompt: string): Promise<string> {
  const provider = detectProvider();
  if (!provider) {
    throw new Error('No AI provider configured');
  }

  switch (provider) {
    case 'anthropic':
      return callAnthropic(prompt);
    case 'openai':
      return callOpenAi(prompt);
    case 'gemini':
      return callGemini(prompt);
  }
}
