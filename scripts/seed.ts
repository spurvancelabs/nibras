import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import Organization from '../models/Organization';
import User from '../models/User';

type SeedUser = {
  name: string;
  email: string;
  role: 'admin' | 'mentor' | 'student';
  password: string;
};

const USERS: SeedUser[] = [
  { name: 'Admin', email: 'admin@lms.dev', role: 'admin', password: 'admin1234' },
  { name: 'Mentor', email: 'mentor@lms.dev', role: 'mentor', password: 'mentor1234' },
  { name: 'Student', email: 'student@lms.dev', role: 'student', password: 'student1234' },
];

async function run() {
  console.log('Connecting to MongoDB...');
  await db();
  console.log('Connected to MongoDB.');

  // Org
  let org = await Organization.findOne({ slug: 'default' });
  if (!org) {
    org = await Organization.create({ name: 'Default Org', slug: 'default' });
    console.log('Created org:', org.name);
  } else {
    console.log('Org exists:', org.name);
  }

  // Users
  for (const u of USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log('User exists:', u.email);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({
      orgId: org._id,
      name: u.name,
      email: u.email,
      passwordHash,
      role: u.role,
    });
    console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
  }

  console.log('\nSeed complete.');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});