import NextAuth from 'next-auth';
verifyEnv();

import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/db/prisma';
import { verifyEnv } from '@/lib/utils/env';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    async signIn({ user }) {
      // Only allow owner sign-in. Optionally, check against an allowlist email env.
      const allowed = process.env.OWNER_EMAIL ? user.email === process.env.OWNER_EMAIL : true;
      return !!allowed;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
