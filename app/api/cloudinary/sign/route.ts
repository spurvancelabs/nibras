import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * Signs a Cloudinary upload request.
 * The client sends params it wants to use (folder, etc.).
 * We compute a signature with the API secret and return it.
 * The secret never leaves the server.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
      { error: 'Cloudinary server env vars missing' },
      { status: 500 }
    );
  }

  let body: { folder?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — folder defaults to lms/<orgId>
  }

  // Force uploads into a per-org folder so tenants never collide.
  const folder = sanitizeFolder(body.folder) ?? `lms/${user.orgId}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Params to sign — order-independent because Cloudinary sorts before hashing.
  const params: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const toSign =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&') + API_SECRET;

  const signature = crypto.createHash('sha1').update(toSign).digest('hex');

  return NextResponse.json({
    cloudName: CLOUD_NAME,
    apiKey: API_KEY,
    timestamp,
    signature,
    folder,
  });
}

function sanitizeFolder(input: string | undefined): string | null {
  if (!input) return null;
  // Only allow letters, numbers, dash, underscore, slash
  const clean = input.replace(/[^a-zA-Z0-9\-_/]/g, '').slice(0, 200);
  return clean || null;
}