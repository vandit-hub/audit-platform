import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION || "us-east-1";

export const s3 = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
        }
      : undefined
});

export async function presignPutUrl(key: string, contentType: string, expiresInSec = 300) {
  const bucket = process.env.S3_BUCKET_NAME!;
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSec });
  return { url, bucket, key, expiresInSec };
}