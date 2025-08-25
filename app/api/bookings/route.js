import prisma from '@/lib/db/prisma';
import { createCalendarEvent } from '@/lib/calendar/google';

export async function POST(request) {
  try {
    const body = await request.json();
    const { conversationId, summary, description, start, end, location, attendees } = body || {};
    if (!conversationId || !start || !end) {
      return new Response(JSON.stringify({ error: 'conversationId, start, end are required' }), { status: 400 });
    }

    const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!convo) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });

    const event = await createCalendarEvent({ summary, description, start, end, location, attendees });

    const booking = await prisma.booking.upsert({
      where: { conversationId: convo.id },
      update: {
        googleEventId: event.id,
        start: new Date(start),
        end: new Date(end),
        status: 'CONFIRMED',
      },
      create: {
        conversationId: convo.id,
        googleEventId: event.id,
        start: new Date(start),
        end: new Date(end),
        status: 'CONFIRMED',
      },
    });

    return new Response(JSON.stringify({ booking, event }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

