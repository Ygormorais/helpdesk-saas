import { MongoClient } from 'mongodb';
import fs from 'node:fs/promises';
import path from 'node:path';

const uri = String(process.env.MONGODB_URI || '').trim();
const dbName = String(process.env.BACKUP_CHECK_DB || 'helpdesk').trim();
const collectionList = String(process.env.BACKUP_CHECK_COLLECTIONS || 'users,tickets')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const outputDir = String(process.env.BACKUP_CHECK_OUTPUT_DIR || 'reports/backup-check').trim();

if (!uri) {
  console.error('[error] MONGODB_URI nao definido.');
  process.exit(2);
}

const startedAt = new Date();
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });

const maskUri = (value) => {
  try {
    const u = new URL(value);
    if (u.password) {
      u.password = '***';
    }
    return u.toString();
  } catch {
    return 'masked';
  }
};

const report = {
  status: 'ok',
  timestamp: startedAt.toISOString(),
  database: dbName,
  collections: {},
  checks: {
    mongoPing: false,
    mongoWritable: false,
  },
  source: {
    uri: maskUri(uri),
  },
};

try {
  await client.connect();
  const db = client.db(dbName);

  const ping = await db.command({ ping: 1 });
  report.checks.mongoPing = ping?.ok === 1;

  const nowCollection = `backup_check_${Date.now()}`;
  await db.createCollection(nowCollection);
  await db.collection(nowCollection).insertOne({ createdAt: new Date() });
  await db.collection(nowCollection).drop();
  report.checks.mongoWritable = true;

  for (const name of collectionList) {
    const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
    const count = exists ? await db.collection(name).estimatedDocumentCount() : 0;
    report.collections[name] = { exists, estimatedCount: count };
  }

  const hasCriticalCollection = Object.values(report.collections).some((entry) => entry.exists);
  if (!hasCriticalCollection) {
    report.status = 'degraded';
    console.error('[error] Nenhuma collection critica encontrada.');
    process.exitCode = 1;
  }
} catch (error) {
  report.status = 'error';
  report.error = error instanceof Error ? error.message : String(error);
  console.error('[error] Backup check falhou:', report.error);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}

const outFile = path.join(
  outputDir,
  `backup-check-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`
);

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(report, null, 2), 'utf8');

console.log(`[info] report: ${outFile}`);
console.log(JSON.stringify(report));

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
