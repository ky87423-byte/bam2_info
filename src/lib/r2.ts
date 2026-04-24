import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET ?? "bam-images";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export async function uploadFileToR2(localPath: string, key: string): Promise<string> {
  const body = fs.readFileSync(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".gif" ? "image/gif" :
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" : "application/octet-stream";

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return `${R2_PUBLIC_URL}/${key}`;
}
