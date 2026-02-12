// Creates a test admin user for local development using mongoose
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk'

async function main() {
  try {
    await mongoose.connect(uri)
    console.log('Connected to MongoDB for test admin')
    const db = mongoose.connection.db

    const tenantsCol = db.collection('tenants')
    const usersCol = db.collection('users')

    // Ensure a test tenant exists
    let tenant = await tenantsCol.findOne({ name: 'DeskFlow Test' })
    if (!tenant) {
      const res = await tenantsCol.insertOne({ name: 'DeskFlow Test' })
      tenant = { _id: res.insertedId, name: 'DeskFlow Test' }
      console.log('Created test tenant: DeskFlow Test')
    }

    // Check if test admin exists
    const email = 'admin@deskflow.test'
    const existing = await usersCol.findOne({ email })
    if (existing) {
      console.log(`Test admin exists: ${email}`)
    } else {
      const hash = await bcrypt.hash('admin', 10)
      await usersCol.insertOne({
        name: 'Test Admin',
        email,
        password: hash,
        role: 'admin',
        tenantId: tenant._id,
      })
      console.log(`Test admin created: ${email}`)
    }
  } catch (err) {
    console.error('Error creating test admin:', err)
  } finally {
    await mongoose.disconnect()
  }
}

main()
