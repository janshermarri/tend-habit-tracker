import 'server-only';

/**
 * One-shot chat completion through the same provider chain the expense tracker
 * uses: Azure AI Foundry (paid, gpt-oss-120b) → Groq (free, gpt-oss) → Gemini
 * (free). All three speak the OpenAI chat/completions shape, so this is plain
 * fetch with no SDK. Providers without a key are skipped; a failing one falls
 * through to the next. AI_PROVIDER reorders the chain ("groq,azure,gemini").
 */
type Endpoint = { label: string; url: string; headers: Record<string, string>; models: string[]; maxField: string; jsonMode: boolean };

const ORDER = ['azure', 'groq', 'gemini'] as const;
type Provider = (typeof ORDER)[number];

const list = (v: string | undefined, fallback: string) =>
  (v ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);

const ENDPOINTS: Record<Provider, () => Endpoint | null> = {
  azure: () => {
    const base = process.env.AZURE_AI_ENDPOINT?.replace(/\/+$/, '');
    const key = process.env.AZURE_AI_KEY;
    if (!base || !key) return null;
    return { label: 'Azure', url: `${base}/chat/completions`, headers: { 'api-key': key }, models: [process.env.AZURE_AI_DEPLOYMENT || 'gpt-oss-120b'], maxField: 'max_completion_tokens',
      // Azure's gpt-oss returns broken output under response_format json_object; the prompt alone is reliable.
      jsonMode: false };
  },
  groq: () => {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    const primary = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
    const models = [primary, ...list(process.env.GROQ_FALLBACK_MODEL, 'openai/gpt-oss-20b').filter((m) => m !== primary)];
    return { label: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', headers: { Authorization: `Bearer ${key}` }, models, maxField: 'max_completion_tokens', jsonMode: true };
  },
  gemini: () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    return { label: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', headers: { Authorization: `Bearer ${key}` }, models: [process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'], maxField: 'max_tokens', jsonMode: true };
  },
};

function chain(): Endpoint[] {
  const listed = list(process.env.AI_PROVIDER, '').map((p) => p.toLowerCase()).filter((p): p is Provider => (ORDER as readonly string[]).includes(p));
  return [...new Set([...listed, ...ORDER])].flatMap((p) => ENDPOINTS[p]() ?? []);
}

export const hasAiProvider = () => chain().length > 0;

export type Completion = { text: string; model: string };

/** The outermost {...} in a reply, parsed; null if there is none or it is broken. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * The first provider's answer. `json` asks for a JSON object and counts a reply
 * that isn't one as a failure, so the chain moves on to the next model.
 */
export async function complete(system: string, user: string, opts: { json?: boolean } = {}): Promise<Completion> {
  const endpoints = chain();
  if (!endpoints.length) throw new Error('No AI provider is configured.');

  for (const ep of endpoints) {
    for (const model of ep.models) {
      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { ...ep.headers, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25_000),
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            [ep.maxField]: 1024,
            // gpt-oss reasons before answering and those tokens are billed as output; keep it short.
            ...(model.includes('gpt-oss') && { reasoning_effort: 'low' }),
            ...(opts.json && ep.jsonMode && { response_format: { type: 'json_object' } }),
          }),
        });
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
        const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) throw new Error('empty answer');
        if (opts.json && !parseJsonObject(text)) throw new Error(`not a JSON object: ${text.slice(0, 120)}`);
        return { text, model: model.split('/').pop() ?? model };
      } catch (e) {
        console.warn(`[ai] ${ep.label} ${model} failed:`, e instanceof Error ? e.message : e);
      }
    }
  }
  throw new Error('No AI provider answered. Try again in a minute.');
}
