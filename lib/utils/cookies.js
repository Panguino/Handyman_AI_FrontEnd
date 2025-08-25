import { cookies } from 'next/headers';

export async function getConversationIdFromCookies() {
  const c = await cookies();
  return c.get('conversationId')?.value || null;
}

export async function setConversationIdCookie(id) {
  const c = await cookies();
  c.set('conversationId', id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearConversationIdCookie() {
  const c = await cookies();
  try {
    c.delete('conversationId');
  } catch (e) {
    // Fallback if delete is unavailable
    c.set('conversationId', '', { path: '/', maxAge: 0 });
  }
}
