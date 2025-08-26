import prisma from '@/lib/db/prisma';
import Link from 'next/link';
import { headers } from 'next/headers';
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
  });

  return (
    <div>
      <h2>Recent Conversations</h2>
      <ul>
        {convos.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/conversations/${c.id}`}>{c.id}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
