import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  const url = new URL(request.url);
  const qId = url.searchParams.get('id');
  const cookieId = await getConversationIdFromCookies();
  const id = isOwner && qId ? qId : cookieId;
  if (!id) return new Response(JSON.stringify({ conversation: null }), { status: 200 });
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  return new Response(JSON.stringify({ conversation }), { status: 200 });
}

export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  const body = await request.json();
  const id = (body?.id || '').toString();
  if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400 });

  const data = {};
  for (const k of ['stage', 'recapText', 'recapConfirmedAt', 'customerName', 'customerEmail', 'customerPhone', 'customerAddress']) {
    if (body[k] !== undefined) data[k] = body[k];
  }
  // Public can only update contact info after recap is confirmed; owners can update any field
  if (!isOwner) {
    const convo = await prisma.conversation.findUnique({ where: { id } });
    if (!convo) return new Response('Not found', { status: 404 });
    // Allow public to move from RECAP_CONFIRMED -> READY_FOR_QUOTING, otherwise forbid stage changes
    if (data.stage && !(convo.stage === 'RECAP_CONFIRMED' && data.stage === 'READY_FOR_QUOTING')) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!(convo.stage === 'RECAP_CONFIRMED' || convo.stage === 'READY_FOR_QUOTING')) return new Response('Forbidden', { status: 403 });
    // Restrict fields for public update
    const allowed = (({ customerName, customerEmail, customerPhone, customerAddress }) => ({
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
    }))(data);
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        ...allowed,
        ...(data.stage === 'READY_FOR_QUOTING' ? { stage: 'READY_FOR_QUOTING' } : {}),
      },
    });
    return new Response(JSON.stringify({ conversation: updated }), { status: 200 });
  }

  const updated = await prisma.conversation.update({ where: { id }, data });
  return new Response(JSON.stringify({ conversation: updated }), { status: 200 });
}
