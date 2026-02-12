/*
  Seed script using MongoDB native driver to avoid framework-specific dependencies.
*/
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk';
  // In MongoDB Node.js Driver v4+, the legacy URL parser and Unified Topology options
  // are no longer required; remove deprecated options to avoid warnings.
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Seed DB connected');
    const db = client.db('helpdesk');

    const tenants = db.collection('tenants');
    const users = db.collection('users');
    const tickets = db.collection('tickets');

    await tenants.deleteMany({});
    await users.deleteMany({});
    await tickets.deleteMany({});

    // Tenants
    const t1 = await tenants.insertOne({ name: 'TechNova Brasil' });
    const t2 = await tenants.insertOne({ name: 'Nebula Finans' });

    // Users
    const u1 = await users.insertOne({ name: 'João Silva', email: 'joao@technova.br', role: 'admin', tenantId: t1.insertedId });
    const u2 = await users.insertOne({ name: 'Ana Martins', email: 'ana@technova.br', role: 'agent', tenantId: t1.insertedId });
    const u3 = await users.insertOne({ name: 'Carlos Lima', email: 'carlos@nebula.br', role: 'admin', tenantId: t2.insertedId });

    // Tickets
    await tickets.insertOne({ title: 'Configurar onboarding', status: 'open', tenantId: t1.insertedId, assignee: 'Ana Martins' });
    await tickets.insertOne({ title: 'Integração PIX', status: 'in_progress', tenantId: t2.insertedId, assignee: 'Carlos Lima' });

    console.log('Seed completed');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await client.close();
  }
}

main();
