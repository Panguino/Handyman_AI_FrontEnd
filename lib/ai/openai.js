import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askModel(messages, options = {}) {
  const model = process.env.OPENAI_MODEL || 'gpt-5';
  const resp = await client.chat.completions.create({
    model,
    messages,
    stream: false,
    ...options,
  });
  return resp;
}

