import { getDb } from '../lib/mongodb'
import bcrypt from 'bcryptjs'

async function main() {
  const db = await getDb()
  const password = await bcrypt.hash('adrms.admin123', 10)

  console.log('Seed started...')

  // Create a default organization for the seed admin
  // Using findOneAndUpdate with upsert: true as an equivalent to prisma.organization.upsert
  const orgResult = await db.collection('Organization').findOneAndUpdate(
    { name: 'National Headquarters' },
    {
      $setOnInsert: {
        name: 'National Headquarters',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true, returnDocument: 'after' }
  )

  const defaultOrgId = orgResult?._id

  if (!defaultOrgId) {
    throw new Error('Failed to create or find default organization')
  }

  // Upsert the primary admin user as SUPER_ADMIN
  const superAdminPassword = await bcrypt.hash('adrms.admin123', 10)
  await db.collection('User').findOneAndUpdate(
    { email: 'admin@adrms.com' },
    {
      $set: {
        role: 'SUPER_ADMIN',
        organizationId: defaultOrgId,
        updatedAt: new Date()
      },
      $setOnInsert: {
        email: 'admin@adrms.com',
        name: 'Super Admin',
        password: superAdminPassword,
        createdAt: new Date()
      }
    },
    { upsert: true }
  )

  console.log('Primary Super Admin upserted.')


  console.log('Seed completed successfully.')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
