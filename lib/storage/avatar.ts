import { promises as fs } from 'node:fs';
import path from 'node:path';

// Stub for Vercel Blob storage. Writes to public/avatars/ so the feature is
// actually testable locally right now. To wire up real Blob storage:
//   1. pnpm add @vercel/blob
//   2. Add BLOB_READ_WRITE_TOKEN to .env (from your Vercel project's Blob store)
//   3. Replace this function body with:
//        import { put } from '@vercel/blob';
//        const blob = await put(`avatars/${userId}-${Date.now()}.${ext}`, file, { access: 'public' });
//        return blob.url;
//
// Important: writing to public/ at request-time only works locally / in a
// traditional Node server. Vercel's serverless filesystem is read-only
// outside /tmp, so this stub will NOT persist uploads in production —
// that's exactly the gap the real Blob integration closes.
export async function storeAvatarFile(userId: number, file: File): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      'BLOB_READ_WRITE_TOKEN is set but lib/storage/avatar.ts still uses the local-disk stub — wire up @vercel/blob\'s put() to actually upload.'
    );
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filename = `${userId}-${Date.now()}.${extension}`;
  const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
  await fs.mkdir(avatarsDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(avatarsDir, filename), buffer);

  return `/avatars/${filename}`;
}
