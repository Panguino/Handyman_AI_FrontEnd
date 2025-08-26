import GoogleProviderImport from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/db/prisma';
import { verifyEnv } from '@/lib/utils/env';

verifyEnv();

const GoogleProvider = GoogleProviderImport?.default || GoogleProviderImport;

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.OWNER_EMAIL ? user.email === process.env.OWNER_EMAIL : true;
      return !!allowed;
    },
  },
  events: {
    async createUser({ user }) {
      try {
        if (user?.email && process.env.OWNER_EMAIL && user.email === process.env.OWNER_EMAIL) {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'OWNER' } });
        }
      } catch (e) {
        console.warn('createUser event error', e);
      }
    },
  },
};
