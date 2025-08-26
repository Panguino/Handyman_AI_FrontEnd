import prisma from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function ConversationDetail({ params }) {
  const session = await getServerSession(authOptions);
  const allowed = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!allowed) {
    return (
      <div>
        <p>Unauthorized.</p>
        <a href='/api/auth/signin'>Sign in</a>
      </div>
    );
  }

  const convo = await prisma.conversation.findUnique({ where: { id: params.id } });
  const messages = await prisma.message.findMany({ where: { conversationId: params.id }, orderBy: { createdAt: 'asc' } });

  async function sendHandyman(formData) {
    'use server';
    const text = formData.get('text');
    if (!text) return;
    await fetch(`${process.env.VERCEL_URL || ''}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Cookies/session are sent by server automatically
      body: JSON.stringify({ text, sender: 'HANDYMAN' }),
    });
  }

  return (
    <div>
      <h2>Conversation {params.id}</h2>
      <div style={{ border: '1px solid #e5e7eb', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        {messages.map((m) => (
          <div key={m.id}>
            <strong>{m.sender}:</strong> {m.text || m.assetId}
          </div>
        ))}
      </div>
      <form action={sendHandyman}>
        <input type='text' name='text' placeholder='Reply as Handyman…' style={{ padding: 8, width: 320 }} />
        <button type='submit' style={{ marginLeft: 8 }}>
          Send
        </button>
      </form>
      <div style={{ marginTop: 12 }}>
        <form
          action={async () => {
            'use server';
            await fetch(`${process.env.VERCEL_URL || ''}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: 'Please continue assisting with the next best question or a concise recap.' }),
            });
          }}
        >
          <button type='submit'>Ask AI</button>
        </form>
      </div>
    </div>
  );
}
