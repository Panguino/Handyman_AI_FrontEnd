import { S3Client } from '@aws-sdk/client-s3';

let s3;

export function getS3Client() {
  if (s3) return s3;
  const region = process.env.S3_REGION;
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === 'true';
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || '';
  s3 = new S3Client({ region, endpoint, forcePathStyle, credentials: { accessKeyId, secretAccessKey } });
  return s3;
}

