// =============================================================================
// FILE: scripts/seed.ts
// Creates the first organisation + admin. SECURITY FIX: no password or email
// is stored in this file any more — pass them as environment variables:
//
//   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_NAME="Your Name" \
//   SEED_ADMIN_PASSWORD='a long random password' npx tsx scripts/seed.ts
//
// (The previous version of this file contained a real admin password. If that
// account still uses it, change the password in the app now.)
// =============================================================================

import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import Organization from '../models/Organization';
import User from '../models/User';

async function run() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const name = (process.env.SEED_ADMIN_NAME ?? 'Admin').trim();
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  if (!email || password.length < 12) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).');
    process.exit(1);
  }

  await db();
  console.log('Connected to database.');

  if (await User.findOne({ email })) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  let org = await Organization.findOne({ slug: 'acme' });
  if (!org) {
    org = await Organization.create({ name: 'Acme Institute', slug: 'acme', status: 'active' });
  }

  const user = await User.create({
    orgId: org._id,
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'admin',
    status: 'active',
  });

  console.log('Admin created:', user.email);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
