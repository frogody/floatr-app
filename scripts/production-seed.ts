import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting production database seeding...')

  try {
    // 1. Create system user for automated reports
    console.log('📝 Creating system user...')
    const systemUser = await prisma.user.upsert({
      where: { clerkUserId: 'system_user' },
      update: {},
      create: {
        clerkUserId: 'system_user',
        email: 'system@floatr.app',
        firstName: 'Floatr',
        lastName: 'System',
        isVerified: true,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    console.log('✅ System user created')

    // 2. Seed maritime zones from GeoJSON
    console.log('🗺️  Importing maritime zones...')
    const zonesPath = path.join(process.cwd(), 'scripts', 'zones.geojson')
    
    if (fs.existsSync(zonesPath)) {
      const zonesData = JSON.parse(fs.readFileSync(zonesPath, 'utf8'))
      
      for (const feature of zonesData.features) {
        const { properties, geometry } = feature
        
        await prisma.noGoZone.upsert({
          where: { name: properties.name },
          update: {
            description: properties.description,
            regulations: properties.regulations,
            authority: properties.authority,
            contactInfo: properties.contactInfo,
            geometry: geometry,
            updatedAt: new Date(),
          },
          create: {
            name: properties.name,
            type: properties.type,
            description: properties.description,
            regulations: properties.regulations,
            authority: properties.authority,
            contactInfo: properties.contactInfo,
            geometry: geometry,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }
      console.log(`✅ Imported ${zonesData.features.length} maritime zones`)
    } else {
      console.log('⚠️  zones.geojson not found, skipping maritime zones import')
    }

    // 3. Create default admin user (if environment variables are set)
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_CLERK_ID) {
      console.log('👤 Creating admin user...')
      await prisma.user.upsert({
        where: { clerkUserId: process.env.ADMIN_CLERK_ID },
        update: {},
        create: {
          clerkUserId: process.env.ADMIN_CLERK_ID,
          email: process.env.ADMIN_EMAIL,
          firstName: 'Admin',
          lastName: 'User',
          isVerified: true,
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      console.log('✅ Admin user created')
    }

    // 4. Initialize application settings
    console.log('⚙️  Initializing app settings...')
    
    const settings = [
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable/disable maintenance mode',
      },
      {
        key: 'max_distance_km',
        value: '50',
        description: 'Maximum discovery distance in kilometers',
      },
      {
        key: 'min_age',
        value: '18',
        description: 'Minimum user age requirement',
      },
      {
        key: 'max_age',
        value: '100',
        description: 'Maximum user age for discovery',
      },
      {
        key: 'content_moderation_enabled',
        value: 'true',
        description: 'Enable automated content moderation',
      },
      {
        key: 'sos_enabled',
        value: 'true',
        description: 'Enable SOS emergency system',
      },
      {
        key: 'app_version',
        value: '1.0.0',
        description: 'Current application version',
      },
    ]

    for (const setting of settings) {
      await prisma.$executeRaw`
        INSERT INTO app_settings (key, value, description, created_at, updated_at)
        VALUES (${setting.key}, ${setting.value}, ${setting.description}, NOW(), NOW())
        ON CONFLICT (key) DO UPDATE SET
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_at = NOW()
      `
    }
    console.log('✅ App settings initialized')

    // 5. Create performance monitoring baseline
    console.log('📊 Creating performance baseline...')
    await prisma.$executeRaw`
      INSERT INTO performance_metrics (metric_name, metric_value, timestamp)
      VALUES 
        ('app_start_time', EXTRACT(EPOCH FROM NOW()), NOW()),
        ('initial_seed_completed', 1, NOW())
      ON CONFLICT (metric_name) DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        timestamp = EXCLUDED.timestamp
    `
    console.log('✅ Performance baseline created')

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