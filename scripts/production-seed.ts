import { PrismaClient } from '../src/generated/prisma'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting production database seeding...')

  try {
    // 1. Create system user for automated reports
    console.log('📝 Creating system user...')
    const systemUser = await prisma.user.upsert({
      where: { clerkId: 'system_user' },
      update: {},
      create: {
        clerkId: 'system_user',
        email: 'system@floatr.app',
        isVerified: true,
        role: 'CAPTAIN',
      },
    })
    console.log('✅ System user created')

    // 2. Create user profile for system user
    console.log('👤 Creating system user profile...')
    await prisma.userProfile.upsert({
      where: { userId: systemUser.id },
      update: {},
      create: {
        userId: systemUser.id,
        firstName: 'Floatr',
        lastName: 'System',
        dateOfBirth: new Date('1990-01-01'),
        bio: 'System user for automated operations',
      },
    })
    console.log('✅ System user profile created')

    // 3. Seed maritime zones from GeoJSON (simplified)
    console.log('🗺️  Importing maritime zones...')
    const zonesPath = path.join(process.cwd(), 'scripts', 'zones.geojson')
    
    if (fs.existsSync(zonesPath)) {
      const zonesData = JSON.parse(fs.readFileSync(zonesPath, 'utf8'))
      let importedCount = 0
      
      for (const feature of zonesData.features) {
        const { properties } = feature
        
        try {
          await prisma.noGoZone.upsert({
            where: { name: properties.name },
            update: {
              description: properties.description,
              zoneType: properties.type,
              regulations: properties.regulations || [],
              authority: properties.authority,
              contactInfo: properties.contactInfo,
              isActive: true,
            },
            create: {
              name: properties.name,
              zoneType: properties.type,
              description: properties.description,
              regulations: properties.regulations || [],
              authority: properties.authority || 'Local Authority',
              contactInfo: properties.contactInfo || 'Contact local authorities for more information',
              geometry: {}, // Simplified for local testing
              isActive: true,
            },
          })
          importedCount++
        } catch (error) {
          console.log(`⚠️  Skipped zone ${properties.name}: ${error.message}`)
        }
      }
      console.log(`✅ Imported ${importedCount} maritime zones`)
    } else {
      console.log('⚠️  zones.geojson not found, skipping maritime zones import')
    }

    // 4. Create default admin user (if environment variables are set)
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_CLERK_ID) {
      console.log('👤 Creating admin user...')
      const adminUser = await prisma.user.upsert({
        where: { clerkId: process.env.ADMIN_CLERK_ID },
        update: {},
        create: {
          clerkId: process.env.ADMIN_CLERK_ID,
          email: process.env.ADMIN_EMAIL,
          isVerified: true,
          role: 'CAPTAIN',
        },
      })
      
      // Create admin user profile
      await prisma.userProfile.upsert({
        where: { userId: adminUser.id },
        update: {},
        create: {
          userId: adminUser.id,
          firstName: 'Admin',
          lastName: 'User',
          dateOfBirth: new Date('1985-01-01'),
          bio: 'Administrative user',
        },
      })
      console.log('✅ Admin user created')
    }

    console.log('🎉 Production seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 