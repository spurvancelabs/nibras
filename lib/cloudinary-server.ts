import 'server-only';
import crypto from 'crypto';

const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;

/**
 * Deletes an uploaded asset from Cloudinary using the Admin API (signed request).
 * Returns true if the asset was deleted (or already absent), false on failure.
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image'
): Promise<boolean> {
  if (!publicId) return true;
  if (!API_KEY || !API_SECRET || !CLOUD_NAME) {
    console.warn('[cloudinary] delete skipped — missing server env vars');
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: API_KEY,
    signature,
  });

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`,
      { method: 'POST', body }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error('[cloudinary] delete failed', res.status, text);
      return false;
    }
    const json = (await res.json()) as { result?: string };
    return json.result === 'ok' || json.result === 'not found';
  } catch (e) {
    console.error('[cloudinary] delete threw', e);
    return false;
  }
}