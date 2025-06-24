import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface ZoneResponse {
  id: string;
  name: string;
  zoneType: string;
  description: string;
  severity: string;
  regulations: string[];
  authority?: string;
  contactInfo?: string;
  coordinates: number[][][];
  createdAt: string;
}

// GET - Fetch no-go zones with optional bounding box filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Optional bounding box parameters for spatial filtering
    const north = searchParams.get('north');
    const south = searchParams.get('south');
    const east = searchParams.get('east');
    const west = searchParams.get('west');
    
    // Optional zone type filtering
    const zoneType = searchParams.get('zoneType');
    const severity = searchParams.get('severity');
    
    let zones: any[];
    
    // If bounding box is provided, use spatial filtering for performance
    if (north && south && east && west) {
      const bbox: BoundingBox = {
        north: parseFloat(north),
        south: parseFloat(south), 
        east: parseFloat(east),
        west: parseFloat(west)
      };
      
      // Validate bounding box
      if (bbox.north <= bbox.south || bbox.east <= bbox.west) {
        return NextResponse.json(
          { error: 'Invalid bounding box coordinates' },
          { status: 400 }
        );
      }
      
      // Build spatial query with PostGIS
      let whereClause = `
        WHERE "isActive" = true 
        AND ST_Intersects(
          geometry,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)
        )
      `;
      
      const params = [bbox.west, bbox.south, bbox.east, bbox.north];
      
      // Add optional filters
      if (zoneType) {
        whereClause += ` AND "zoneType" = $${params.length + 1}`;
        params.push(zoneType);
      }
      
      if (severity) {
        whereClause += ` AND severity = $${params.length + 1}`;
        params.push(severity);
      }
      
      // Execute spatial query with GeoJSON output
      zones = await prisma.$queryRawUnsafe(`
        SELECT 
          id,
          name,
          "zoneType",
          description,
          severity,
          regulations,
          authority,
          "contactInfo",
          "createdAt",
          ST_AsGeoJSON(geometry) as geometry_json
        FROM no_go_zones
        ${whereClause}
        ORDER BY severity DESC, name ASC
      `, ...params);
      
    } else {
      // Fetch all zones without spatial filtering
      let whereConditions = ['isActive = true'];
      const params: any[] = [];
      
      if (zoneType) {
        whereConditions.push(`"zoneType" = $${params.length + 1}`);
        params.push(zoneType);
      }
      
      if (severity) {
        whereConditions.push(`severity = $${params.length + 1}`);
        params.push(severity);
      }
      
      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      zones = await prisma.$queryRawUnsafe(`
        SELECT 
          id,
          name,
          "zoneType",
          description,
          severity,
          regulations,
          authority,
          "contactInfo", 
          "createdAt",
          ST_AsGeoJSON(geometry) as geometry_json
        FROM no_go_zones
        ${whereClause}
        ORDER BY severity DESC, name ASC
        LIMIT 1000
      `, ...params);
    }
    
    // Transform results to proper format
    const formattedZones: ZoneResponse[] = zones.map((zone: any) => {
      let coordinates: number[][][] = [];
      
      // Parse PostGIS geometry JSON
      if (zone.geometry_json) {
        try {
          const geoJson = JSON.parse(zone.geometry_json);
          coordinates = geoJson.coordinates || [];
        } catch (error) {
          console.error('Error parsing geometry for zone:', zone.id, error);
        }
      }
      
      // Parse regulations array if it's a JSON string
      let regulations = zone.regulations;
      if (typeof regulations === 'string') {
        try {
          regulations = JSON.parse(regulations);
        } catch {
          regulations = [regulations];
        }
      }
      
      return {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        description: zone.description,
        severity: zone.severity,
        regulations: regulations || [],
        authority: zone.authority,
        contactInfo: zone.contactInfo,
        coordinates,
        createdAt: zone.createdAt,
      };
    });
    
    // Log usage for analytics
    await prisma.auditLog.create({
      data: {
        action: 'zones_fetched',
        resourceType: 'NoGoZone',
        details: {
          zonesCount: formattedZones.length,
          boundingBox: north && south && east && west ? { north, south, east, west } : null,
          filters: { zoneType, severity },
          userAgent: request.headers.get('user-agent'),
        },
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        zones: formattedZones,
        totalZones: formattedZones.length,
        filters: {
          zoneType: zoneType || null,
          severity: severity || null,
          boundingBox: north && south && east && west 
            ? { north: parseFloat(north), south: parseFloat(south), east: parseFloat(east), west: parseFloat(west) }
            : null,
        },
        metadata: {
          supportedZoneTypes: [
            'ECOLOGICAL',
            'ALCOHOL_FREE', 
            'QUIET_ZONE',
            'NO_ANCHOR',
            'HIGH_TRAFFIC',
            'SPEED_RESTRICTED',
            'PROTECTED_AREA'
          ],
          supportedSeverities: ['info', 'warning', 'danger'],
        },
      },
    });
    
  } catch (error) {
    console.error('Error fetching no-go zones:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching zones' },
      { status: 500 }
    );
  }
}

// POST - Check if a point is within any no-go zones
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;
    
    // Validation
    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Missing required parameters: latitude, longitude' },
        { status: 400 }
      );
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      );
    }
    
    // Query zones that contain the point using PostGIS
    const containingZones = await prisma.$queryRawUnsafe(`
      SELECT 
        id,
        name,
        "zoneType",
        description,
        severity,
        regulations,
        authority,
        "contactInfo"
      FROM no_go_zones
      WHERE "isActive" = true
      AND ST_Contains(geometry, ST_Point($1, $2))
      ORDER BY severity DESC
    `, lng, lat);
    
    // Parse regulations for each zone
    const zones = (containingZones as any[]).map(zone => ({
      ...zone,
      regulations: typeof zone.regulations === 'string' 
        ? JSON.parse(zone.regulations) 
        : zone.regulations || []
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        point: { latitude: lat, longitude: lng },
        withinZones: zones.length > 0,
        zones: zones,
        highestSeverity: zones.length > 0 
          ? zones.reduce((max, zone) => {
              const severityOrder = { info: 1, warning: 2, danger: 3 };
              return severityOrder[zone.severity as keyof typeof severityOrder] > severityOrder[max as keyof typeof severityOrder] 
                ? zone.severity 
                : max;
            }, 'info')
          : null,
      },
    });
    
  } catch (error) {
    console.error('Error checking point in zones:', error);
    return NextResponse.json(
      { error: 'Internal server error while checking zones' },
      { status: 500 }
    );
  }
} 