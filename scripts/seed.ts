
import bcrypt from 'bcryptjs';
import { db } from '../lib/db';
import Organization from '../models/Organization';
import User from '../models/User';

async function run() {
  await db();
  console.log('Connected to database.');

  const email = 'muhammadabdullahkhaver@gmail.com';

  // Avoid creating a duplicate user
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    console.log('User already exists:', email);
    process.exit(0);
  }

  // Find or create the organization
  let org = await Organization.findOne({ slug: 'acme' });

  if (!org) {
    org = await Organization.create({
      name: 'Acme Institute',
      slug: 'acme',
      status: 'active',
    });
  }

  const passwordHash = await bcrypt.hash(
    'SfvxwZLoumUPNhZ2',
    10
  );

  const user = await User.create({
    orgId: org._id,
    name: 'Muhammad Abdullah Khaver',
    email,
    passwordHash,
    role: 'admin',
    status: 'active',
  });

  console.log('User created successfully:');
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);

  process.exit(0);
}

run().catch((error) => {
  console.error('Failed to create user:', error);
  process.exit(1);
});
