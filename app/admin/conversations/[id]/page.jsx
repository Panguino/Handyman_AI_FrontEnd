import prisma from '@/lib/db/prisma';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { baseUrl } from '@/lib/utils/env';
import AdminChatWindow from '@/components/AdminChatWindow';
import StageTimeline from '@/components/StageTimeline';

export default async function ConversationDetail({ params }) {
  const h = await headers();
  const cookie = h.get('cookie') || '';
  const res = await fetch(`${baseUrl()}/api/auth/session`, { cache: 'no-store', headers: { cookie } });
  const session = res.ok ? await res.json() : null;
  const allowed = !!(session?.user?.email && process.env.OWNER_EMAIL && session.user.email === process.env.OWNER_EMAIL);
  if (!allowed) {
    return (
      <div>
        <p>Unauthorized.</p>
        <a href='/api/auth/signin'>Sign in</a>
      </div>
    );
  }

  const p = await params;
  const id = p.id;
  const convo = await prisma.conversation.findUnique({ where: { id } });
  const latestDraft = await prisma.estimateSummary.findFirst({ where: { conversationId: id }, orderBy: { version: 'desc' } });

  async function updateStage(nextStage) {
    'use server';
    await fetch(`${baseUrl()}/api/conversations`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage: nextStage }),
    });
    revalidatePath(`/admin/conversations/${id}`);
  }

  return (
    <div>
      <div style={{ margin: '8px 0' }}>
        <a href='/admin' style={{ color: 'var(--fg)' }}>
          &larr; Back to conversations
        </a>
      </div>
      <div style={{ margin: '8px 0' }}>
        <StageTimeline stage={convo?.stage} />
      </div>
      {convo?.stage === 'READY_FOR_QUOTING' && (
        <div style={{ margin: '8px 0', display: 'flex', gap: 8 }}>
          <form action={async () => updateStage('QUOTING')}>
            <button type='submit'>Approve and move to QUOTING</button>
          </form>
          <form action={async () => updateStage('RECAP_PENDING')}>
            <button type='submit'>Send back for changes</button>
          </form>
        </div>
      )}
      {convo?.stage === 'QUOTING' && (
        <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <form
            action={async () => {
              'use server';
              await fetch(`${baseUrl()}/api/estimates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: id }),
              });
              revalidatePath(`/admin/conversations/${id}`);
            }}
          >
            <button type='submit'>Generate draft estimate</button>
          </form>
          {latestDraft && (
            <>
              <form
                action={async (formData) => {
                  'use server';
                  const payload = {
                    id: formData.get('id'),
                    timeEstimateMinHours: Number(formData.get('tMin') || 0),
                    timeEstimateMaxHours: Number(formData.get('tMax') || 0),
                    priceRangeMin: Number(formData.get('pMin') || 0),
                    priceRangeMax: Number(formData.get('pMax') || 0),
                    disclaimer: formData.get('disclaimer') || '',
                  };
                  await fetch(`${baseUrl()}/api/estimates`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });
                  revalidatePath(`/admin/conversations/${id}`);
                }}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input type='hidden' name='id' defaultValue={latestDraft.id} />
                <label>
                  Time (min)
                  <input type='number' name='tMin' defaultValue={latestDraft.timeEstimateMinHours || 0} style={{ width: 80, marginLeft: 4 }} />
                </label>
                <label>
                  Time (max)
                  <input type='number' name='tMax' defaultValue={latestDraft.timeEstimateMaxHours || 0} style={{ width: 80, marginLeft: 4 }} />
                </label>
                <label>
                  Price (min)
                  <input type='number' name='pMin' defaultValue={latestDraft.priceRangeMin || 0} style={{ width: 100, marginLeft: 4 }} />
                </label>
                <label>
                  Price (max)
                  <input type='number' name='pMax' defaultValue={latestDraft.priceRangeMax || 0} style={{ width: 100, marginLeft: 4 }} />
                </label>
                <input name='disclaimer' placeholder='Disclaimer' defaultValue={latestDraft.disclaimer || ''} style={{ width: 260 }} />
                <button type='submit'>Save draft</button>
              </form>
              <form
                action={async () => {
                  'use server';
                  await fetch(`${baseUrl()}/api/estimates`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: latestDraft.id, status: 'SENT' }),
                  });
                  revalidatePath(`/admin/conversations/${id}`);
                }}
              >
                <button type='submit'>Send draft to customer</button>
              </form>
            </>
          )}
        </div>
      )}
      <AdminChatWindow conversationId={id} />
    </div>
  );
}
