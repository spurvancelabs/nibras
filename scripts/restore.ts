// =============================================================================
// FILE: scripts/restore.ts   (NEW FILE)
// Restore a backup made by scripts/backup.ts.
//
//   MONGODB_URI='…' npx tsx scripts/restore.ts backups/<folder> --confirm
//
// SAFE BY DEFAULT: only inserts documents whose _id is missing (existing
// records are left untouched). Add --replace to overwrite documents with the
// same _id from the backup. Without --confirm it only prints what it would do.
// Test on a copy of the database first.
// =============================================================================

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI;
  const dir = process.argv[2];
  const confirm = process.argv.includes('--confirm');
  const replace = process.argv.includes('--replace');
  if (!uri || !dir) {
    console.error('Usage: MONGODB_URI=… npx tsx scripts/restore.ts <backup-folder> [--confirm] [--replace]');
    process.exit(1);
  }
  const { EJSON } = mongoose.mongo.BSON;
  await mongoose.connect(uri);
  const database = mongoose.connection.db!;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ejson.gz'));
  for (const f of files) {
    const name = f.replace(/\.ejson\.gz$/, '');
    const col = database.collection(name);
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(dir, f)).pipe(zlib.createGunzip()), crlfDelay: Infinity });
    let total = 0;
    let written = 0;
    let batch: unknown[] = [];
    const flush = async () => {
      if (!batch.length || !confirm) {
        batch = [];
        return;
      }
      const ops = batch.map((d) => {
        const doc = d as { _id: unknown };
        return replace ? { replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } } : { updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: doc }, upsert: true } };
      });
      const r = await col.bulkWrite(ops as never, { ordered: false });
      written += (r.upsertedCount ?? 0) + (replace ? r.modifiedCount ?? 0 : 0);
      batch = [];
    };
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }));
      total++;
      if (batch.length >= 500) await flush();
    }
    await flush();
    console.log(`  ${name.padEnd(28)} ${total} in backup${confirm ? ` · ${written} written` : ''}`);
  }
  await mongoose.disconnect();
  if (!confirm) console.log('\nDry run only. Add --confirm to write.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
