// =============================================================================
// FILE: lib/ai-provider.ts   (NEW FILE — server only)
// Talks to ANY OpenAI-compatible chat API (Groq, Google Gemini's OpenAI
// endpoint, OpenRouter, Together, a local Ollama, OpenAI…). Configured only
// through environment variables — keys are never stored in the database or
// sent to the browser:
//   AI_BASE_URL   e.g. https://api.groq.com/openai/v1
//   AI_API_KEY    the provider key (optional for a local Ollama)
//   AI_MODEL      e.g. llama-3.3-70b-versatile
//   AI_TIMEOUT_MS optional, default 8000 (Vercel functions stop at 10 s)
// Set AI_PROVIDER=mock to test the whole flow without a provider.
// =============================================================================

import 'server-only';

export function aiConfigured(): boolean {
  if (process.env.AI_PROVIDER === 'mock') return true;
  return Boolean(process.env.AI_BASE_URL && process.env.AI_MODEL);
}

export function aiModelName(): string {
  return process.env.AI_PROVIDER === 'mock' ? 'mock' : process.env.AI_MODEL ?? '';
}

export type ChatMessage = { role: 'system' | 'user'; content: string };

export class AiError extends Error {
  constructor(
    message: string,
    public readonly retryable = false
  ) {
    super(message);
  }
}

/** One JSON-mode chat completion. Returns the raw text the model produced. */
export async function chatJson(messages: ChatMessage[], opts: { maxTokens?: number; mock?: () => string } = {}): Promise<{ text: string; tokens: number }> {
  if (process.env.AI_PROVIDER === 'mock') {
    return { text: opts.mock ? opts.mock() : '{}', tokens: 0 };
  }
  const base = (process.env.AI_BASE_URL ?? '').replace(/\/+$/, '');
  const model = process.env.AI_MODEL ?? '';
  if (!base || !model) throw new AiError('AI provider is not configured');
  let url: URL;
  try {
    url = new URL(`${base}/chat/completions`);
  } catch {
    throw new AiError('AI_BASE_URL is not a valid URL');
  }
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new AiError('AI_BASE_URL must use https');
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.AI_TIMEOUT_MS) || 8_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        ...(process.env.AI_API_KEY ? { authorization: `Bearer ${process.env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: opts.maxTokens ?? 1200,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const retry = res.status === 429 || res.status >= 500;
      throw new AiError(`AI provider answered ${res.status}`, retry);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number } };
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new AiError('AI provider returned an empty answer', true);
    return { text, tokens: Number(data.usage?.total_tokens) || 0 };
  } catch (e) {
    if (e instanceof AiError) throw e;
    if ((e as Error).name === 'AbortError') throw new AiError('AI provider timed out', true);
    throw new AiError('Could not reach the AI provider', true);
  } finally {
    clearTimeout(timer);
  }
}
