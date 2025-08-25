import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === 'true',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isMultipart = contentType.includes('multipart/form-data');
    if (!isMultipart) return new Response(JSON.stringify({ error: 'multipart/form-data required' }), { status: 400 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return new Response(JSON.stringify({ error: 'file field required' }), { status: 400 });
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) return new Response(JSON.stringify({ error: 'S3_BUCKET not set' }), { status: 500 });

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

    const url = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL
      ? `${process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL}/${key}`
      : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

    return new Response(JSON.stringify({ ok: true, key, url }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}

