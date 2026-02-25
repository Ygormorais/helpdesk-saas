import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

export async function putTextObject(params: {
  bucket: string;
  key: string;
  body: string;
  contentType: string;
}) {
  const s3 = makeS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType
    })
  );
}
