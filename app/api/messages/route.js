import prisma from '@/lib/db/prisma';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function GET(request) {
  const url = new URL(request.url);
  const qId = url.searchParams.get('conversationId');
  const session = await getServerSession(authOptions);
  const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  const cookieConvId = await getConversationIdFromCookies();
  const conversationId = isOwner && qId ? qId : cookieConvId;
  if (!conversationId) return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
  return new Response(JSON.stringify({ messages }), { status: 200 });
}

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const body = await request.json();
    const text = (body?.text || '').toString().trim();
    if (!text) return new Response(JSON.stringify({ error: 'text required' }), { status: 400 });

    const session = await getServerSession(authOptions);
    const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);

    const requestedSender = (body?.sender || '').toString().toUpperCase();
    const sender = isOwner && requestedSender === 'HANDYMAN' ? 'HANDYMAN' : 'CUSTOMER';

    const cookieConvId = await getConversationIdFromCookies();
    const reqConvId = (body?.conversationId || url.searchParams.get('conversationId'))?.toString();
    const conversationId = isOwner && reqConvId ? reqConvId : cookieConvId;
    if (!conversationId) return new Response(JSON.stringify({ error: 'No conversation' }), { status: 400 });

    const message = await prisma.message.create({
      data: { conversationId, sender, type: 'TEXT', text },
    });

    return new Response(JSON.stringify({ message }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
