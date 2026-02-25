import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function boolEnv(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export function makeS3Client() {
  const region = process.env.AWS_REGION || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = boolEnv("S3_FORCE_PATH_STYLE", false);

  return new S3Client({
    region,
    endpoint,
    forcePathStyle
  });
}

export async function presignGetObject(params: {
  bucket: string;
  key: string;
  expiresInSeconds: number;
}) {
  const s3 = makeS3Client();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: params.bucket, Key: params.key }),
    { expiresIn: params.expiresInSeconds }
  );
}
