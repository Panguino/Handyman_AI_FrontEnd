import prisma from '@/lib/db/prisma';
import Link from 'next/link';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { baseUrl } from '@/lib/utils/env';

export default async function AdminHome() {
  const h = await headers();
  const cookie = h.get('cookie') || '';
  const res = await fetch(`${baseUrl()}/api/auth/session`, { cache: 'no-store', headers: { cookie } });
  const session = res.ok ? await res.json() : null;
  const allowed = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!allowed) {
    return (
      <div>
        <p>You must sign in as the owner to view the console.</p>
        <a href='/api/auth/signin?callbackUrl=/admin'>Sign in with Google</a>
      </div>
    );
  }

  const convos = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      messages: { select: { id: true } },
      booking: true,
    },
  });

  const stageBadge = (s) => (
    <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {s?.replaceAll('_', ' ') || '—'}
    </span>
  );

  async function deleteConversation(formData) {
    'use server';
    const id = formData.get('id');
    if (!id) return;
    await prisma.booking.deleteMany({ where: { conversationId: id } });
    await prisma.estimateSummary.deleteMany({ where: { conversationId: id } });
    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });
    revalidatePath('/admin');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Owner Console</h2>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Signed in as {session?.user?.name || session?.user?.email}</div>
        </div>
        <a href='/api/auth/signout?callbackUrl=/'>Sign out</a>
      </div>

      <h3 style={{ marginTop: 16 }}>Recent Conversations</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>ID</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>Created</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>Updated</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>Messages</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>Booking</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 4px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {convos.map((c) => (
            <tr key={c.id}>
              <td style={{ padding: '8px 4px' }}>
                <Link href={`/admin/conversations/${c.id}`}>{c.id.slice(0, 8)}…</Link>
              </td>
              <td style={{ padding: '8px 4px' }}>{new Date(c.createdAt).toLocaleString()}</td>
              <td style={{ padding: '8px 4px' }}>{new Date(c.updatedAt).toLocaleString()}</td>
              <td style={{ padding: '8px 4px' }}>{c.messages.length}</td>
              <td style={{ padding: '8px 4px' }}>
                {c.booking ? `${new Date(c.booking.start).toLocaleString()}–${new Date(c.booking.end).toLocaleString()}` : '—'}
              </td>
              <td style={{ padding: '8px 4px' }}>
                <Link href={`/admin/conversations/${c.id}`} style={{ marginRight: 8 }}>
                  View
                </Link>
                <form action={deleteConversation} style={{ display: 'inline' }}>
                  <input type='hidden' name='id' value={c.id} />
                  <button type='submit' style={{ color: '#b91c1c' }}>
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
