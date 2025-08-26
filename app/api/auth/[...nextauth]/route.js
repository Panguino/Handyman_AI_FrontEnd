import NextAuthImport from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';

const NextAuth = NextAuthImport?.default || NextAuthImport;
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
