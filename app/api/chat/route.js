import { askModel } from '@/lib/ai/openai';

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages = [] } = body || {};
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), { status: 400 });
    }
    const resp = await askModel(messages);
    return new Response(JSON.stringify(resp), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

