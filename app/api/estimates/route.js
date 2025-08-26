import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function POST(request) {
  // Admin-only: generate a new draft estimate for a conversation
  const session = await getServerSession(authOptions);
  const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!isOwner) return new Response('Forbidden', { status: 403 });
  const body = await request.json();
  const conversationId = (body?.conversationId || '').toString();
  if (!conversationId) return new Response(JSON.stringify({ error: 'conversationId required' }), { status: 400 });

  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });

  // Determine next version
  const latest = await prisma.estimateSummary.findFirst({ where: { conversationId }, orderBy: { version: 'desc' } });
  const version = (latest?.version || 0) + 1;

  // Create an empty draft if none exists or a new version as requested
  const draft = await prisma.estimateSummary.create({
    data: {
      conversationId,
      version,
      status: 'DRAFT',
      scope: {},
      materials: {},
      timeEstimateMinHours: 0,
      timeEstimateMaxHours: 0,
      priceRangeMin: 0,
      priceRangeMax: 0,
      assumptions: {},
      risks: {},
      disclaimer: 'This is a draft estimate and subject to change after final review.',
    },
  });

  // Move conversation to QUOTING if not already
  if (convo.stage === 'READY_FOR_QUOTING') {
    await prisma.conversation.update({ where: { id: conversationId }, data: { stage: 'QUOTING' } });
  }

  return new Response(JSON.stringify({ estimate: draft }), { status: 200 });
}

export async function PATCH(request) {
  // Admin-only: update draft estimate or mark as SENT
  const session = await getServerSession(authOptions);
  const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!isOwner) return new Response('Forbidden', { status: 403 });
  const body = await request.json();
  const id = (body?.id || '').toString();
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const data = {};
  for (const k of ['scope', 'materials', 'timeEstimateMinHours', 'timeEstimateMaxHours', 'priceRangeMin', 'priceRangeMax', 'assumptions', 'risks', 'disclaimer', 'status']) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  const updated = await prisma.estimateSummary.update({ where: { id }, data });

  // If marking as SENT, post it to the conversation as a message
  if (body.status === 'SENT') {
    const convo = await prisma.conversation.findUnique({ where: { id: updated.conversationId } });
    const sections = [
      '# Estimate',
      '## Scope',
      '```json',
      JSON.stringify(updated.scope || {}, null, 2),
      '```',
      '## Time estimate',
      `${updated.timeEstimateMinHours ?? 0}–${updated.timeEstimateMaxHours ?? 0} hours`,
      '## Materials (approx.)',
      '```json',
      JSON.stringify(updated.materials || {}, null, 2),
      '```',
      '## Price range',
      `$${updated.priceRangeMin ?? 0}–$${updated.priceRangeMax ?? 0}`,
      '## Assumptions',
      '```json',
      JSON.stringify(updated.assumptions || {}, null, 2),
      '```',
      '## Risks',
      '```json',
      JSON.stringify(updated.risks || {}, null, 2),
      '```',
      updated.disclaimer ? `> ${updated.disclaimer}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await prisma.message.create({
      data: { conversationId: updated.conversationId, sender: 'ASSISTANT', type: 'TEXT', text: sections },
    });

    await prisma.estimateSummary.update({ where: { id: updated.id }, data: { sentAt: new Date() } });
    // Optionally move to APPROVED or keep in QUOTING; we leave stage unchanged until explicit approval.
  }

  return new Response(JSON.stringify({ estimate: updated }), { status: 200 });
}

