import { PrismaClient } from '@/generated/prisma';
import fs from 'fs';
import path from 'path';

// Initialize Prisma client
const prisma = new PrismaClient();

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    zoneType: 'ECOLOGICAL' | 'ALCOHOL_FREE' | 'QUIET_ZONE' | 'NO_ANCHOR' | 'HIGH_TRAFFIC' | 'SPEED_RESTRICTED' | 'PROTECTED_AREA';
    description: string;
    severity: 'info' | 'warning' | 'danger';
    regulations: string[];
    authority?: string;
    contactInfo?: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Convert GeoJSON coordinates to PostGIS POLYGON format
 */
function coordinatesToPostGIS(coordinates: number[][][]): string {
  // Take the first ring (exterior ring) of the polygon
  const ring = coordinates[0];
  
  // Format coordinates as "longitude latitude" pairs
  const points = ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ');
  
  // Return PostGIS POLYGON format
  return `POLYGON((${points}))`;
}

/**
 * Import no-go zones from GeoJSON file
 */
async function importNoGoZones() {
  console.log('🗺️  Starting no-go zones import...');
  
  try {
    // Read the GeoJSON file
    const zonesPath = path.join(__dirname, 'zones.geojson');
    
    if (!fs.existsSync(zonesPath)) {
      throw new Error(`GeoJSON file not found at: ${zonesPath}`);
    }
    
    const geoJsonData = fs.readFileSync(zonesPath, 'utf8');
    const zones: GeoJSONCollection = JSON.parse(geoJsonData);
    
    console.log(`📍 Found ${zones.features.length} zones in GeoJSON file`);
    
    // Clear existing zones (optional - for fresh import)
    const existingCount = await prisma.noGoZone.count();
    if (existingCount > 0) {
      console.log(`🗑️  Removing ${existingCount} existing zones...`);
      await prisma.noGoZone.deleteMany({});
    }
    
    // Import each zone
    let importedCount = 0;
    let errorCount = 0;
    
    for (const feature of zones.features) {
      try {
        const { properties, geometry } = feature;
        
        // Validate required fields
        if (!properties.name || !properties.zoneType || !properties.description) {
          console.warn(`⚠️  Skipping zone with missing required fields:`, properties.name || 'Unknown');
          errorCount++;
          continue;
        }
        
        // Convert coordinates to PostGIS format
        const postgisGeometry = coordinatesToPostGIS(geometry.coordinates);
        
        // Create the zone using raw SQL for PostGIS geometry
        await prisma.$executeRawUnsafe(`
          INSERT INTO no_go_zones (
            id, name, "zoneType", description, geometry, "isActive", 
            severity, regulations, authority, "contactInfo", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, 
            ST_GeomFromText($4, 4326),
            $5, $6, $7, $8, $9, NOW(), NOW()
          )
        `,
          properties.name,
          properties.zoneType,
          properties.description,
          postgisGeometry,
          true, // isActive
          properties.severity || 'warning',
          JSON.stringify(properties.regulations || []),
          properties.authority || null,
          properties.contactInfo || null
        );
        
        importedCount++;
        console.log(`✅ Imported: ${properties.name} (${properties.zoneType})`);
        
      } catch (error) {
        console.error(`❌ Error importing zone "${feature.properties.name}":`, error);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`✅ Successfully imported: ${importedCount} zones`);
    if (errorCount > 0) {
      console.log(`❌ Failed to import: ${errorCount} zones`);
    }
    
    // Verify import with a count
    const finalCount = await prisma.noGoZone.count();
    console.log(`📊 Total zones in database: ${finalCount}`);
    
    // Show zone type distribution
    console.log('\n📈 Zone distribution by type:');
    const zoneTypes = await prisma.$queryRaw`
      SELECT "zoneType", COUNT(*) as count 
      FROM no_go_zones 
      GROUP BY "zoneType"
      ORDER BY count DESC
    ` as Array<{ zoneType: string; count: bigint }>;
    
    zoneTypes.forEach(type => {
      console.log(`   ${type.zoneType}: ${type.count} zones`);
    });
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify PostGIS extension is available
 */
async function verifyPostGIS() {
  try {
    await prisma.$queryRaw`SELECT PostGIS_Version()`;
    console.log('✅ PostGIS extension is available');
    return true;
  } catch (error) {
    console.error('❌ PostGIS extension not found. Please install PostGIS for PostgreSQL.');
    console.error('   Installation instructions: https://postgis.net/install/');
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🌊 Floatr No-Go Zones Import Script');
  console.log('=====================================\n');
  
  // Verify PostGIS availability
  const hasPostGIS = await verifyPostGIS();
  if (!hasPostGIS) {
    process.exit(1);
  }
  
  // Run the import
  await importNoGoZones();
  
  console.log('\n🏁 Import script completed successfully!');
}

// Run the script
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { importNoGoZones, verifyPostGIS }; 