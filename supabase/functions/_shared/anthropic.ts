/**
 * The only file that knows the AI provider is Anthropic. Swap this out to change
 * providers; the three function handlers and the whole mobile app stay the same.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.120.0';

const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY is not set for this function.');
}

const client = new Anthropic({ apiKey: apiKey ?? '' });

export const MODEL = 'claude-sonnet-5';

type TextPart = { type: 'text'; text: string };
type ImagePart = {
  type: 'image';
  source: { type: 'base64'; media_type: string; data: string };
};
export type UserContent = string | Array<TextPart | ImagePart>;

type CallOpts = {
  system: string;
  content: UserContent;
  maxTokens?: number;
};

/** Single-turn call that returns raw assistant text. */
export async function callClaudeText({
  system,
  content,
  maxTokens = 1200,
}: CallOpts): Promise<string> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: content as any }],
  });

  if (res.stop_reason === 'refusal') {
    throw new Error('The assistant could not help with that request.');
  }

  return (res.content as any[])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

/**
 * Call Claude and parse a JSON value out of the reply. The system prompt must
 * instruct the model to return only JSON. Tolerates code fences and stray prose.
 */
export async function callClaudeJson<T>(opts: CallOpts): Promise<T> {
  const text = await callClaudeText(opts);
  return extractJson<T>(text);
}

export function extractJson<T>(text: string): T {
  let s = text.trim();

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  if (!(s.startsWith('{') || s.startsWith('['))) {
    const start = s.search(/[[{]/);
    const end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
  }

  try {
    return JSON.parse(s) as T;
  } catch (_e) {
    throw new Error('The assistant returned a response that could not be read.');
  }
}
