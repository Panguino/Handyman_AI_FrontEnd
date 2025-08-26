import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { streamModel, askModel } from '@/lib/ai/openai';
import { systemPrompt } from '@/lib/ai/prompt';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
    if (!isOwner) return new Response('Forbidden', { status: 403 });

    const body = await request.json();
    const conversationId = (body?.conversationId || '').toString();
    const prompt = (body?.prompt || '').toString();
    if (!conversationId) return new Response(JSON.stringify({ error: 'conversationId required' }), { status: 400 });

    const history = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 50 });
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.sender === 'ASSISTANT' ? 'assistant' : 'user', content: m.text || '' })),
    ];
    if (prompt) messages.push({ role: 'user', content: prompt });

    let fullText = '';
    const encoder = new TextEncoder();
    try {
      const stream = await streamModel(messages);
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk?.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(delta));
              }
            }
          } catch (e) {
            controller.error(e);
          } finally {
            controller.close();
            if (fullText.trim()) {
              await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: fullText } });
            }
          }
        },
      });
      return new Response(readable, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' } });
    } catch (err) {
      const resp = await askModel(messages);
      const assistantText = resp?.choices?.[0]?.message?.content || '';
      if (assistantText.trim()) {
        await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: assistantText } });
      }
      return new Response(JSON.stringify({ content: assistantText }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

