import { PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '@/lib/db/prisma';
import { getConversationIdFromCookies } from '@/lib/utils/cookies';
import { getS3Client } from '@/lib/storage/s3';

export const runtime = 'nodejs';

const s3 = getS3Client();

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    if (!isMultipart) return new Response(JSON.stringify({ error: 'multipart/form-data required' }), { status: 400 });

    // Validate env early for clearer errors
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    const akid = process.env.S3_ACCESS_KEY_ID;
    const secret = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !region || !akid || !secret) {
      return new Response(JSON.stringify({ error: 'Missing S3 env: ensure S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY' }), {
        status: 500,
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'file field required' }), { status: 400 });
    }

    const maxMb = Number(process.env.MAX_UPLOAD_MB || 15);
    if (file.size > maxMb * 1024 * 1024) {
      return new Response(JSON.stringify({ error: `File too large. Max ${maxMb}MB` }), { status: 413 });
    }

    const key = `uploads/${Date.now()}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(arrayBuffer),
        ContentType: file.type || 'application/octet-stream',
      })
    );

    // Build a private proxy URL for viewing
    const url = `/api/assets?key=${encodeURIComponent(key)}`;

    // Persist asset and image message if a conversation exists
    const conversationId = await getConversationIdFromCookies();
    let asset = null;
    if (conversationId) {
      asset = await prisma.asset.create({
        data: {
          url,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        },
      });
      await prisma.message.create({
        data: {
          conversationId,
          sender: 'CUSTOMER',
          type: 'IMAGE',
          assetId: asset.id,
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, key, url, assetId: asset?.id || null }), { status: 200 });
  } catch (err) {
    console.error('Upload error:', err);
    const details = {
      name: err?.name || 'Error',
      message: err?.message || String(err),
      code: err?.code || err?.Code || undefined,
      httpStatus: err?.$metadata?.httpStatusCode,
    };
    return new Response(JSON.stringify({ error: details }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
