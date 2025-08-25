import { clearConversationIdCookie } from '@/lib/utils/cookies';

export async function POST() {
  await clearConversationIdCookie();
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

