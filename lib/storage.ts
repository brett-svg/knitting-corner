// Object storage on Railway Buckets (S3-compatible). Buckets are private;
// files are served through /api/files/[...key], which checks ownership.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export function hasStorage(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );
}

const g = globalThis as unknown as { __kcS3?: S3Client };

function client(): S3Client {
  if (!g.__kcS3) {
    if (!hasStorage()) throw new Error("S3_* storage env vars are not set");
    g.__kcS3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "auto",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }
  return g.__kcS3;
}

const bucket = () => process.env.S3_BUCKET!;

// Keys are namespaced by owner: <kind>/<userId>/<uuid>.<ext>
export function objectKey(kind: "yarn-photos" | "pattern-pdfs" | "pattern-covers", userId: string, ext: string) {
  return `${kind}/${userId}/${crypto.randomUUID()}.${ext.replace(/^\./, "")}`;
}

export function ownsKey(key: string, userId: string): boolean {
  return key.split("/")[1] === userId;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType })
  );
}

export async function getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (!res.Body) return null;
    const body = Buffer.from(await res.Body.transformToByteArray());
    return { body, contentType: res.ContentType ?? "application/octet-stream" };
  } catch (err) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

export async function getObjectStream(key: string) {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  return res;
}

// Best-effort; callers don't want a missing file to fail a delete.
export async function deleteObject(key: string | null | undefined) {
  if (!key) return;
  try {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.warn("[storage] delete failed:", key, err instanceof Error ? err.message : err);
  }
}

// URL the browser uses for a stored file.
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key}` : null;
}
