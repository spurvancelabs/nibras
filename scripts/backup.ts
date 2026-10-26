// =============================================================================
// FILE: scripts/backup.ts   (NEW FILE)
// Full database backup to your computer (one gzipped Extended-JSON file per
// collection). Read-only — it never changes the database.
//
//   MONGODB_URI='mongodb+srv://…' npx tsx scripts/backup.ts [folder]
//
// Default folder: backups/<date-time>/. Keep backups somewhere private: they
// contain password hashes and personal data. MongoDB Atlas also offers
// automatic backups on paid tiers; this script works on every tier.
// Restore with scripts/restore.ts.
// =============================================================================

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI first.');
    process.exit(1);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(process.argv[2] ?? path.join('backups', stamp));
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  await mongoose.connect(uri);
  const database = mongoose.connection.db!;
  const { EJSON } = mongoose.mongo.BSON;
  const cols = await database.listCollections({}, { nameOnly: true }).toArray();
  const manifest: Record<string, number> = {};
  for (const c of cols) {
    if (c.name.startsWith('system.')) continue;
    const file = path.join(dir, `${c.name}.ejson.gz`);
    const gz = zlib.createGzip();
    const out = fs.createWriteStream(file, { mode: 0o600 });
    gz.pipe(out);
    let n = 0;
    for await (const doc of database.collection(c.name).find({})) {
      gz.write(EJSON.stringify(doc, { relaxed: false }) + '\n');
      n++;
    }
    gz.end();
    await new Promise<void>((r) => out.on('finish', () => r()));
    manifest[c.name] = n;
    console.log(`  ${c.name.padEnd(28)} ${n}`);
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), collections: manifest }, null, 2), { mode: 0o600 });
  await mongoose.disconnect();
  console.log(`\nBackup written to ${dir}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
