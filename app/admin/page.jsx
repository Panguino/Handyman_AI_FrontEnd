import prisma from '@/lib/db/prisma';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export default async function AdminHome() {
  const session = await getServerSession(authOptions);
  const allowed = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!allowed) {
    return (
      <div>
        <p>You must sign in as the owner to view the console.</p>
        <a href='/api/auth/signin'>Sign in with Google</a>
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

