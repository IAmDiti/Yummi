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

/** A JSON Schema describing an object — the exact shape a call should return. */
export type ObjectSchema = { type: 'object'; [key: string]: unknown };

type CallOpts = {
  system: string;
  content: UserContent;
  /** JSON Schema for the result object. The model is forced to fill it in. */
  schema: ObjectSchema;
  maxTokens?: number;
};

/**
 * Single-turn call that returns a structured object matching `schema`.
 *
 * Rather than ask the model to type a JSON object into its reply and then parse
 * it back out (which fails whenever the model adds a code fence, a trailing
 * comma, a stray sentence, or an unescaped quote inside a string), we expose a
 * single tool whose input schema *is* the desired result and force the model to
 * call it. The SDK returns `tool_use.input` already parsed — there is no text to
 * scrape and no "response that could not be read" failure mode.
 */
export async function callClaudeStructured<T>({
  system,
  content,
  schema,
  maxTokens = 2000,
}: CallOpts): Promise<T> {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    // These are constrained extraction/generation tasks, not open reasoning
    // problems. Disabling thinking keeps them fast and cheap and sidesteps the
    // forced-tool-choice / thinking incompatibility.
    thinking: { type: 'disabled' },
    system,
    messages: [{ role: 'user', content: content as any }],
    tools: [
      {
        name: 'respond',
        description: 'Return the result to the app in the required structure.',
        input_schema: schema as any,
      },
    ],
    tool_choice: { type: 'tool', name: 'respond' },
  });

  if (res.stop_reason === 'refusal') {
    throw new Error('The assistant could not help with that request.');
  }
  if (res.stop_reason === 'max_tokens') {
    // The forced tool call was cut off mid-argument — its input is incomplete.
    throw new Error('The assistant ran out of room to finish. Try again.');
  }

  const toolUse = (res.content as any[]).find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.input == null) {
    throw new Error('The assistant returned a response that could not be read.');
  }

  return toolUse.input as T;
}
