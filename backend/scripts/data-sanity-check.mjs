import { MongoClient } from 'mongodb';
import fs from 'node:fs/promises';
import path from 'node:path';

const uri = String(process.env.MONGODB_URI || '').trim();
const dbName = String(process.env.DATA_SANITY_CHECK_DB || 'helpdesk').trim();
const outputDir = String(process.env.DATA_SANITY_CHECK_OUTPUT_DIR || 'reports/data-sanity-check').trim();
const sampleLimit = Math.max(1, Number(process.env.DATA_SANITY_SAMPLE_LIMIT || '10'));

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
  source: {
    uri: maskUri(uri),
  },
  summary: {
    tenants: 0,
    users: 0,
  },
  checks: {
    mongoPing: false,
    collections: {
      tenantsExists: false,
      usersExists: false,
    },
    usersWithoutTenant: {
      count: 0,
      sample: [],
    },
    activeUsersInInactiveTenant: {
      count: 0,
      sample: [],
    },
    tenantsWithoutActiveAdmin: {
      count: 0,
      sample: [],
    },
    duplicateUserEmails: {
      count: 0,
      sample: [],
    },
    usersWithInvalidPasswordHash: {
      count: 0,
      sample: [],
    },
  },
};

function sampleProjection(cursorPromise) {
  return cursorPromise.then((rows) => rows.slice(0, sampleLimit));
}

try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');
  const tenants = db.collection('tenants');

  const ping = await db.command({ ping: 1 });
  report.checks.mongoPing = ping?.ok === 1;

  const [usersExists, tenantsExists] = await Promise.all([
    db.listCollections({ name: 'users' }, { nameOnly: true }).hasNext(),
    db.listCollections({ name: 'tenants' }, { nameOnly: true }).hasNext(),
  ]);

  report.checks.collections.usersExists = usersExists;
  report.checks.collections.tenantsExists = tenantsExists;

  if (!usersExists || !tenantsExists) {
    report.status = 'error';
    report.error = 'Collections criticas ausentes: users/tenants';
    process.exitCode = 1;
  } else {
    report.summary.users = await users.estimatedDocumentCount();
    report.summary.tenants = await tenants.estimatedDocumentCount();

    const [
      usersWithoutTenant,
      activeUsersInInactiveTenant,
      tenantsWithoutActiveAdmin,
      duplicateUserEmails,
      usersWithInvalidPasswordHash,
    ] = await Promise.all([
      users.aggregate([
        {
          $lookup: {
            from: 'tenants',
            localField: 'tenant',
            foreignField: '_id',
            as: 'tenantDocs',
          },
        },
        {
          $match: {
            $or: [
              { tenant: { $exists: false } },
              { tenant: null },
              { tenantDocs: { $size: 0 } },
            ],
          },
        },
        {
          $project: {
            _id: 0,
            email: 1,
            tenant: 1,
            isActive: 1,
          },
        },
      ]).toArray(),
      users.aggregate([
        {
          $lookup: {
            from: 'tenants',
            localField: 'tenant',
            foreignField: '_id',
            as: 'tenantDocs',
          },
        },
        { $unwind: '$tenantDocs' },
        {
          $match: {
            isActive: true,
            'tenantDocs.isActive': false,
          },
        },
        {
          $project: {
            _id: 0,
            email: 1,
            tenantId: '$tenantDocs._id',
            tenantSlug: '$tenantDocs.slug',
          },
        },
      ]).toArray(),
      tenants.aggregate([
        {
          $lookup: {
            from: 'users',
            let: { tenantId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$tenant', '$$tenantId'] },
                      { $eq: ['$role', 'admin'] },
                      { $eq: ['$isActive', true] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'adminUsers',
          },
        },
        {
          $match: {
            adminUsers: { $size: 0 },
          },
        },
        {
          $project: {
            _id: 0,
            tenantId: '$_id',
            slug: 1,
            name: 1,
            isActive: 1,
          },
        },
      ]).toArray(),
      users.aggregate([
        {
          $group: {
            _id: { $toLower: '$email' },
            count: { $sum: 1 },
            userIds: { $push: '$_id' },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            email: '$_id',
            count: 1,
            userIds: 1,
          },
        },
      ]).toArray(),
      users.find({
        $or: [
          { password: { $exists: false } },
          { password: null },
          { password: '' },
          { password: { $not: /^\$2[aby]\$/ } },
        ],
      }, {
        projection: {
          _id: 0,
          email: 1,
          tenant: 1,
        },
      }).toArray(),
    ]);

    report.checks.usersWithoutTenant.count = usersWithoutTenant.length;
    report.checks.usersWithoutTenant.sample = usersWithoutTenant.slice(0, sampleLimit);

    report.checks.activeUsersInInactiveTenant.count = activeUsersInInactiveTenant.length;
    report.checks.activeUsersInInactiveTenant.sample = activeUsersInInactiveTenant.slice(0, sampleLimit);

    report.checks.tenantsWithoutActiveAdmin.count = tenantsWithoutActiveAdmin.length;
    report.checks.tenantsWithoutActiveAdmin.sample = tenantsWithoutActiveAdmin.slice(0, sampleLimit);

    report.checks.duplicateUserEmails.count = duplicateUserEmails.length;
    report.checks.duplicateUserEmails.sample = duplicateUserEmails.slice(0, sampleLimit);

    report.checks.usersWithInvalidPasswordHash.count = usersWithInvalidPasswordHash.length;
    report.checks.usersWithInvalidPasswordHash.sample = usersWithInvalidPasswordHash.slice(0, sampleLimit);

    const hasFindings = [
      report.checks.usersWithoutTenant.count,
      report.checks.activeUsersInInactiveTenant.count,
      report.checks.tenantsWithoutActiveAdmin.count,
      report.checks.duplicateUserEmails.count,
      report.checks.usersWithInvalidPasswordHash.count,
    ].some((count) => count > 0);

    if (hasFindings) {
      report.status = 'degraded';
      process.exitCode = 1;
    }
  }
} catch (error) {
  report.status = 'error';
  report.error = error instanceof Error ? error.message : String(error);
  console.error('[error] Data sanity check falhou:', report.error);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}

const outFile = path.join(
  outputDir,
  `data-sanity-check-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`
);

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, JSON.stringify(report, null, 2), 'utf8');

console.log(`[info] report: ${outFile}`);
console.log(JSON.stringify(report));

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
