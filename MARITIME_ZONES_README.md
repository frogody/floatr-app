# 🗺️ Maritime Zones & Compliance System

## Overview
The Maritime Zones system provides comprehensive waterway compliance features for Floatr, ensuring users are informed about restricted areas, no-go zones, and maritime regulations.

## Features
- **No-Go Zones Display**: Visual overlay of restricted maritime areas
- **Real-time Warnings**: Alerts when users attempt to place pins in restricted zones
- **Compliance Information**: Detailed regulations and authority contacts
- **Zone Types**: Ecological, Speed-Restricted, Alcohol-Free, Quiet Zones, etc.

## Database Setup

### Prerequisites
1. **PostGIS Extension**: Required for spatial geometry operations
   ```bash
   # For PostgreSQL installations
   sudo apt-get install postgis postgresql-15-postgis-3
   
   # Or using Homebrew on macOS
   brew install postgis
   ```

2. **Enable PostGIS in Database**:
   ```sql
   -- Connect to your database and run:
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_Version();
   ```

### Database Migration
```bash
# Generate Prisma client with new schema
npx prisma generate

# Apply database migrations 
npx prisma db push
```

## Data Import

### 1. Zone Data Import
```bash
# Import sample maritime zones
npm run zones:import
```

### 2. Custom Zone Data
To add your own maritime zones, edit `scripts/zones.geojson` with valid GeoJSON:

```json
{
  "type": "Feature",
  "properties": {
    "name": "Custom Protected Area",
    "zoneType": "ECOLOGICAL",
    "description": "Protected marine habitat",
    "severity": "danger",
    "regulations": ["No anchoring", "Speed limit: 5 knots"],
    "authority": "Marine Authority",
    "contactInfo": "contact@authority.gov"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [-122.4000, 37.8000],
      [-122.3800, 37.8000],
      [-122.3800, 37.8200],
      [-122.4000, 37.8200],
      [-122.4000, 37.8000]
    ]]
  }
}
```

## Zone Types

| Zone Type | Color | Description |
|-----------|-------|-------------|
| `ECOLOGICAL` | 🟢 Green | Protected marine sanctuaries |
| `ALCOHOL_FREE` | 🟡 Amber | No alcohol consumption zones |
| `QUIET_ZONE` | 🔵 Blue | Noise-restricted areas |
| `NO_ANCHOR` | 🔴 Red | Anchoring prohibited |
| `HIGH_TRAFFIC` | 🔴 Dark Red | Commercial shipping lanes |
| `SPEED_RESTRICTED` | 🟠 Orange | Speed limit zones |
| `PROTECTED_AREA` | 🟢 Emerald | General protected areas |

## Severity Levels
- **Info** (30% opacity): General information zones
- **Warning** (50% opacity): Caution required
- **Danger** (70% opacity): Strict enforcement, serious violations

## API Endpoints

### GET /api/zones
Fetch maritime zones with optional filtering:
```bash
# Get all zones
curl "/api/zones"

# Get zones in bounding box
curl "/api/zones?north=37.9&south=37.7&east=-122.3&west=-122.5"

# Filter by zone type
curl "/api/zones?zoneType=ECOLOGICAL&severity=danger"
```

### POST /api/zones
Check if coordinates are within restricted zones:
```bash
curl -X POST "/api/zones" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 37.8, "longitude": -122.4}'
```

## Frontend Integration

### Map Display
The zones automatically display on the `/dashboard/map` page with:
- **Interactive Polygons**: Click zones for detailed information
- **Color-coded Overlays**: Visual severity indication
- **Zone Legend**: Real-time zone type legend
- **Pin Placement Warnings**: Automatic restriction alerts

### User Experience
1. **Zone Information**: Click any zone polygon for regulations and contact info
2. **Pin Placement**: System warns before placing pins in restricted areas
3. **Visual Indicators**: Clear color coding for different zone types and severities

## Troubleshooting

### PostGIS Not Found
```bash
# Verify PostGIS installation
psql -d your_database -c "SELECT PostGIS_Version();"

# If extension missing, install:
psql -d your_database -c "CREATE EXTENSION postgis;"
```

### Import Script Errors
```bash
# Check file permissions
chmod +x scripts/import-zones.ts

# Verify GeoJSON format
cat scripts/zones.geojson | jq .

# Check database connection
npm run zones:import
```

### Mapbox Integration
Ensure your `.env` file has:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

## Performance Optimization

### Spatial Indexing
PostGIS automatically creates spatial indexes for geometry columns. For large datasets:

```sql
-- Create additional indexes if needed
CREATE INDEX idx_zones_geometry_gist ON no_go_zones USING GIST (geometry);
CREATE INDEX idx_zones_type ON no_go_zones (zoneType);
CREATE INDEX idx_zones_severity ON no_go_zones (severity);
```

### Bounding Box Queries
The API automatically uses spatial bounding box queries for performance when viewport bounds are provided.

## Compliance Features

### Regulation Display
- Full regulation lists with authority information
- Contact details for questions or emergencies
- Severity-based visual warnings

### Audit Trail
All zone interactions are logged in the audit system for compliance tracking.

## Future Enhancements

### Planned Features
- [ ] Seasonal zone updates (whale migration corridors)
- [ ] Weather-based temporary restrictions
- [ ] Real-time NOAA/Coast Guard integration
- [ ] Offline zone caching for cellular dead zones
- [ ] Push notifications for zone entry/exit

### Data Sources
- NOAA Marine Protected Areas
- US Coast Guard Navigation Rules
- Local Harbor Authority Regulations
- Environmental Protection Zones

## Support

For maritime compliance questions:
- **Technical Issues**: Check logs in `/api/zones` responses
- **Zone Data**: Update `scripts/zones.geojson` and re-import
- **Performance**: Monitor spatial query performance in database logs

**Important**: This system provides informational guidance only. Always consult official nautical charts and local maritime authorities for current regulations and safety information. 