import prisma from '@/lib/db/prisma';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';

export async function GET() {
  const conversationId = await getConversationIdFromCookies();
  if (!conversationId) return new Response(JSON.stringify({ messages: [] }), { status: 200 });
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
  return new Response(JSON.stringify({ messages }), { status: 200 });
}
