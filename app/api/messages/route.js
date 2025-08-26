import prisma from '@/lib/db/prisma';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const conversationId = await getConversationIdFromCookies();
  if (!conversationId) return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
  return new Response(JSON.stringify({ messages }), { status: 200 });
}

export async function POST(request) {
  try {
    const conversationId = await getConversationIdFromCookies();
    if (!conversationId) return new Response(JSON.stringify({ error: 'No conversation' }), { status: 400 });
    const body = await request.json();
    const text = (body?.text || '').toString().trim();
    if (!text) return new Response(JSON.stringify({ error: 'text required' }), { status: 400 });

    const session = await getServerSession(authOptions);
    const isOwner = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
    const requestedSender = (body?.sender || '').toString().toUpperCase();
    const sender = isOwner && requestedSender === 'HANDYMAN' ? 'HANDYMAN' : 'CUSTOMER';

    const message = await prisma.message.create({
      data: { conversationId, sender, type: 'TEXT', text },
    });

    return new Response(JSON.stringify({ message }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
