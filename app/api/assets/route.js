import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/storage/s3';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    const bucket = process.env.S3_BUCKET;
    if (!bucket) return new Response('Missing S3_BUCKET', { status: 500 });

    const s3 = getS3Client();
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

    const headers = new Headers();
    if (res.ContentType) headers.set('Content-Type', res.ContentType);
    if (res.ContentLength) headers.set('Content-Length', String(res.ContentLength));
    if (res.ETag) headers.set('ETag', res.ETag);
    // Cache for short time; tune as needed
    headers.set('Cache-Control', 'private, max-age=60');

    return new Response(res.Body, { status: 200, headers });
  } catch (err) {
    const details = {
      name: err?.name || 'Error',
      message: err?.message || String(err),
      code: err?.code || err?.Code || undefined,
      httpStatus: err?.$metadata?.httpStatusCode,
    };
    return new Response(JSON.stringify({ error: details }), { status: 500 });
  }
}

