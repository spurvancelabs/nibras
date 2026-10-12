import { db } from '../lib/db';

async function run() {
  const conn = await db();
  console.log('Connected to MongoDB:', conn.connection.host);
  console.log('DB name:', conn.connection.name);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});