import prisma from '@/lib/db/prisma';
import { streamModel, askModel } from '@/lib/ai/openai';
import { systemPrompt } from '@/lib/ai/prompt';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';

function isAffirmation(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return /^(yes|yep|yeah|correct|looks good|sounds good|that'?s right|approve|ok|okay)/.test(t);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { content } = body || {};
    const lower = (content || '').toLowerCase().trim();
    const wantsRecap = lower === 'recap' || lower.startsWith('recap ');
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
      data: { conversationId, sender: 'CUSTOMER', type: 'TEXT', text: content },
    });

    // Read conversation and history
    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });

    // If user explicitly requests a recap, move to RECAP_PENDING and steer the model
    if (wantsRecap && (convo?.stage === 'DEFINITION' || convo?.stage === 'RECAP_PENDING')) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { stage: 'RECAP_PENDING' } });
    }

    // Handle stage transitions and gating
    // If user affirms recap, mark recap confirmed and request contact
    if ((convo?.stage === 'RECAP_PENDING' || convo?.stage === 'DEFINITION') && isAffirmation(content)) {
      const msg =
        'Great! I’ll lock in that summary. Next, please share your contact info so we can prepare your estimate: full name, a phone number for texts, your email, and the service address. After that, our handyman will review and approve next steps before any estimate is shared.';
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { stage: 'RECAP_CONFIRMED', recapConfirmedAt: new Date(), contactRequestedAt: new Date() },
      });
      await prisma.message.create({
        data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: msg },
      });
      return new Response(JSON.stringify({ content: msg }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // If recap is confirmed but contact missing, ask for contact and do not estimate
    if (convo?.stage === 'RECAP_CONFIRMED' && !(convo.customerName && (convo.customerEmail || convo.customerPhone) && convo.customerAddress)) {
      const msg = 'Before we prepare your estimate, please share your contact info: full name, phone (for texts), email, and your service address.';
      await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: msg } });
      return new Response(JSON.stringify({ content: msg }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // If ready for quoting, inform user we are waiting for handyman review; ignore free-form chats
    if (convo?.stage === 'READY_FOR_QUOTING') {
      const msg = 'Thanks — we have what we need. A handyman will review and prepare a draft estimate. We’ll notify you as soon as it’s ready.';
      await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: msg } });
      return new Response(JSON.stringify({ content: msg }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Load recent history (last 50 messages)
    const history = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' }, take: 50 });

    // Build dynamic system gating
    const guards = [];
    if (!convo || ['DEFINITION', 'RECAP_PENDING', 'RECAP_CONFIRMED', 'READY_FOR_QUOTING', 'QUOTING'].includes(convo.stage)) {
      guards.push(
        'Policy: Do NOT provide any numeric prices, totals, or ranges (no currency amounts) until the owner approves. Focus on questions, recap, or contact collection as appropriate.'
      );
    }
    if (wantsRecap) {
      guards.push(
        'User requested a recap: produce a concise bullet-list recap and ask “Does that look right? Reply yes to confirm.” Do not include prices.'
      );
    }
    if (convo?.stage === 'RECAP_CONFIRMED') {
      guards.push('Policy: Ask for contact info (full name, phone, email, service address) and hold estimates until provided.');
    }

    const messages = [
      { role: 'system', content: [systemPrompt, ...guards].join('\n\n') },
      ...history.map((m) => ({ role: m.sender === 'CUSTOMER' ? 'user' : 'assistant', content: m.text || '' })),
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
            try {
              if (fullText.trim()) {
                await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: fullText } });
              }
            } catch (e) {
              console.error('Failed to save assistant message:', e);
            }
          }
        },
      });

      return new Response(readable, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' },
      });
    } catch (streamErr) {
      console.warn('Streaming failed, falling back to non-streaming:', streamErr);
      const resp = await askModel(messages);
      const assistantText = resp?.choices?.[0]?.message?.content || 'Thanks, I noted that.';
      if (assistantText.trim()) {
        await prisma.message.create({ data: { conversationId, sender: 'ASSISTANT', type: 'TEXT', text: assistantText } });
      }
      return new Response(JSON.stringify({ content: assistantText }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    console.error('Chat route error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
