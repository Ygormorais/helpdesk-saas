/*
  Seed script using MongoDB native driver.
  It creates minimal documents compatible with the Mongoose schemas.
*/
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load backend env vars (MONGODB_URI, etc.)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Seed DB connected');

    const dbNameFromUri = (() => {
      try {
        const u = new URL(uri);
        const p = String(u.pathname || '').replace(/^\//, '');
        return p && p !== '' ? p : '';
      } catch {
        return '';
      }
    })();
    const db = client.db(dbNameFromUri || process.env.MONGODB_DB || 'helpdesk');

    const tenants = db.collection('tenants');
    const users = db.collection('users');
    const categories = db.collection('categories');
    const tickets = db.collection('tickets');
    const planLimits = db.collection('planlimits');

    await Promise.all([
      tenants.deleteMany({}),
      users.deleteMany({}),
      categories.deleteMany({}),
      tickets.deleteMany({}),
      planLimits.deleteMany({}),
    ]);

    const now = new Date();
    const responseDue = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const resolutionDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Tenants
    const tenantDocs = [
      {
        name: 'TechNova Brasil',
        slug: slugify('TechNova Brasil'),
        primaryColor: '#3B82F6',
        settings: {
          ticketPrefix: 'TKT',
          defaultLanguage: 'pt-BR',
          timezone: 'America/Sao_Paulo',
          workingHours: { start: '09:00', end: '18:00' },
          slaResponseTime: 4,
          slaResolutionTime: 24,
        },
        subscription: { plan: 'free', status: 'trial' },
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const tenantInsert = await tenants.insertMany(tenantDocs);
    const techNovaTenantId = tenantInsert.insertedIds[0];

    // Plan limits (trial/free by default)
    await planLimits.insertOne({
      tenant: techNovaTenantId,
      plan: 'free',
      maxAgents: 1,
      maxTickets: 50,
      maxStorage: 100,
      features: {
        knowledgeBase: false,
        timeTracking: false,
        webhooks: false,
        satisfactionSurvey: true,
        advancedReports: false,
        api: false,
        customDomain: false,
        whiteLabel: false,
      },
      currentUsage: { agents: 1, tickets: 0, storage: 0 },
      subscription: {
        status: 'trialing',
        trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
      createdAt: now,
      updatedAt: now,
    });

    // Users
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const userInsert = await users.insertMany([
      {
        email: 'admin@technova.br',
        password: hashedPassword,
        name: 'Admin TechNova',
        role: 'admin',
        tenant: techNovaTenantId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: 'agent@technova.br',
        password: hashedPassword,
        name: 'Agente TechNova',
        role: 'agent',
        tenant: techNovaTenantId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        email: 'cliente@technova.br',
        password: hashedPassword,
        name: 'Cliente TechNova',
        role: 'client',
        tenant: techNovaTenantId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const adminUserId = userInsert.insertedIds[0];
    const agentUserId = userInsert.insertedIds[1];
    const clientUserId = userInsert.insertedIds[2];

    // Categories
    const categoryInsert = await categories.insertMany([
      {
        name: 'Geral',
        description: 'Assuntos gerais',
        color: '#6B7280',
        tenant: techNovaTenantId,
        isActive: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const generalCategoryId = categoryInsert.insertedIds[0];

    // Tickets
    await tickets.insertMany([
      {
        ticketNumber: 'TKT-0001',
        title: 'Primeiro ticket (seed)',
        description: 'Ticket criado via seed para validar o fluxo ponta-a-ponta.',
        status: 'open',
        priority: 'medium',
        category: generalCategoryId,
        tenant: techNovaTenantId,
        createdBy: clientUserId,
        assignedTo: agentUserId,
        tags: ['seed'],
        attachments: [],
        sla: { responseDue, resolutionDue },
        metadata: { source: 'portal' },
        createdAt: now,
        updatedAt: now,
      },
    ]);

    console.log('Seed completed');
    console.log('Login seed user: admin@technova.br / admin123');
  } catch (err) {
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
