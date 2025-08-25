import prisma from '@/lib/db/prisma';
import { getConversationIdFromCookies, setConversationIdCookie } from '@/lib/utils/cookies';

export async function GET() {
  let convId = await getConversationIdFromCookies();
  if (convId) {
    const existing = await prisma.conversation.findUnique({ where: { id: convId } });
    if (existing) {
      return new Response(JSON.stringify({ conversationId: convId }), { status: 200 });
    }
  }
  const convo = await prisma.conversation.create({ data: {} });
  await setConversationIdCookie(convo.id);

  // Seed a friendly assistant introduction message for new conversations
  const handyman = process.env.HANDYMAN_NAME || 'Troutman Handyman';
  const intro = `Hi! I’m the AI assistant helping ${handyman}. I’ll ask a few quick questions to learn about your project. You can also upload photos anytime. What are you working on today?`;
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      sender: 'ASSISTANT',
      type: 'TEXT',
      text: intro,
    },
  });

  return new Response(JSON.stringify({ conversationId: convo.id }), { status: 200 });
}
