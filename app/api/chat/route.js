import prisma from '@/lib/db/prisma';
import { streamModel, askModel } from '@/lib/ai/openai';
import { systemPrompt } from '@/lib/ai/prompt';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';

export async function POST(request) {
  try {
    const body = await request.json();
    const { content } = body || {};
    if (!content || typeof content !== 'string') {
      return new Response(JSON.stringify({ error: 'content is required' }), { status: 400 });
    }

    // Ensure conversation exists
    const conversationId = await getConversationIdFromCookies();
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'No conversation session' }), { status: 400 });
    }

    // Persist user message
    await prisma.message.create({
      data: {
        conversationId,
        sender: 'CUSTOMER',
        type: 'TEXT',
        text: content,
      },
    });

    // Load recent history (last 50 messages)
    const history = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.sender === 'CUSTOMER' ? 'user' : 'assistant',
        content: m.text || '',
      })),
    ];

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
            // Save assistant message after stream ends
            try {
              if (fullText.trim()) {
                await prisma.message.create({
                  data: {
                    conversationId,
                    sender: 'ASSISTANT',
                    type: 'TEXT',
                    text: fullText,
                  },
                });
              }
            } catch (e) {
              console.error('Failed to save assistant message:', e);
            }
          }
        },
      });

      return new Response(readable, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (streamErr) {
      // Fallback to non-streaming if streaming is not allowed
      console.warn('Streaming failed, falling back to non-streaming:', streamErr);
      const resp = await askModel(messages);
      const assistantText = resp?.choices?.[0]?.message?.content || 'Thanks, I noted that.';
      if (assistantText.trim()) {
        await prisma.message.create({
          data: {
            conversationId,
            sender: 'ASSISTANT',
            type: 'TEXT',
            text: assistantText,
          },
        });
      }
      return new Response(JSON.stringify({ content: assistantText }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Chat route error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
