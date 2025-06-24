import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {} as Record<string, any>
    }

    // Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`
      health.checks.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      health.checks.database = {
        status: 'unhealthy',
        error: 'Database connection failed',
        responseTime: Date.now() - startTime
      }
      health.status = 'unhealthy'
    }

    // PostGIS extension check
    try {
      await prisma.$queryRaw`SELECT PostGIS_Version()`
      health.checks.postgis = {
        status: 'healthy',
        responseTime: Date.now() - startTime
      }
    } catch (error) {
      health.checks.postgis = {
        status: 'unhealthy',
        error: 'PostGIS extension not available'
      }
    }

    // External services check (basic connectivity)
    const externalServices = []

    // Clerk API check
    if (process.env.CLERK_SECRET_KEY) {
      externalServices.push({
        name: 'clerk',
        url: 'https://api.clerk.com/v1/health'
      })
    }

    // Mapbox API check
    if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      externalServices.push({
        name: 'mapbox',
        url: 'https://api.mapbox.com/v1'
      })
    }

    // Check external services
    for (const service of externalServices) {
      try {
        const serviceStartTime = Date.now()
        const response = await fetch(service.url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Floatr-Health-Check'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        health.checks[service.name] = {
          status: response.ok ? 'healthy' : 'degraded',
          responseTime: Date.now() - serviceStartTime,
          statusCode: response.status
        }
      } catch (error) {
        health.checks[service.name] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Memory usage check
    const memUsage = process.memoryUsage()
    health.checks.memory = {
      status: 'healthy',
      usage: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      }
    }

    // Check if memory usage is concerning (over 80% of heap)
    const heapUsagePercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100
    if (heapUsagePercentage > 80) {
      health.checks.memory.status = 'degraded'
      health.checks.memory.warning = 'High memory usage detected'
    }

    // Overall response time
    health.responseTime = Date.now() - startTime

    // Determine overall status
    const unhealthyChecks = Object.values(health.checks).filter(
      (check: any) => check.status === 'unhealthy'
    )
    
    if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy'
    } else {
      const degradedChecks = Object.values(health.checks).filter(
        (check: any) => check.status === 'degraded'
      )
      if (degradedChecks.length > 0) {
        health.status = 'degraded'
      }
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503

    return NextResponse.json(health, { status: statusCode })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    }, { status: 503 })
  }
} 