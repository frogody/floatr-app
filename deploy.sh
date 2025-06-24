#!/bin/bash

# Floatr Production Deployment Script
# This script automates the build, push, and deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"docker.io"}
IMAGE_NAME=${IMAGE_NAME:-"floatr"}
VERSION=${VERSION:-$(date +%Y%m%d-%H%M%S)}
ENVIRONMENT=${ENVIRONMENT:-"production"}

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Pre-deployment checks
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running or not accessible"
    fi
    
    # Check if required files exist
    if [[ ! -f "Dockerfile" ]]; then
        error "Dockerfile not found"
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        error "docker-compose.yml not found"
    fi
    
    if [[ ! -f ".env.production" ]]; then
        warning ".env.production not found. Using .env.production.example"
        if [[ ! -f ".env.production.example" ]]; then
            error ".env.production.example not found"
        fi
        cp .env.production.example .env.production
    fi
    
    success "Prerequisites check passed"
}

# Build the application
build_application() {
    log "Building Floatr application..."
    
    # Clean previous builds
    docker system prune -f --volumes
    
    # Build the Docker image
    docker build \
        --tag "${IMAGE_NAME}:${VERSION}" \
        --tag "${IMAGE_NAME}:latest" \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
        --build-arg VERSION="${VERSION}" \
        .
    
    success "Application built successfully"
}

# Run tests before deployment
run_tests() {
    log "Running tests..."
    
    # Run unit and integration tests
    npm run test:unit
    npm run test:integration
    
    # Run E2E tests against built image
    docker run --rm \
        --env-file .env.production \
        -e NODE_ENV=test \
        "${IMAGE_NAME}:${VERSION}" \
        npm run test:e2e:headless
    
    success "All tests passed"
}

# Push to registry
push_to_registry() {
    if [[ "${DOCKER_REGISTRY}" != "docker.io" ]]; then
        log "Pushing image to registry ${DOCKER_REGISTRY}..."
        
        # Tag for registry
        docker tag "${IMAGE_NAME}:${VERSION}" "${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
        docker tag "${IMAGE_NAME}:latest" "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
        
        # Push to registry
        docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
        docker push "${DOCKER_REGISTRY}/${IMAGE_NAME}:latest"
        
        success "Images pushed to registry"
    else
        log "Skipping registry push (using local Docker)"
    fi
}

# Database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Ensure database is running
    docker-compose up -d database redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose exec database pg_isready -U floatr_user -d floatr_production; do sleep 2; done'
    
    # Run Prisma migrations
    docker-compose run --rm app npx prisma migrate deploy
    
    # Generate Prisma client
    docker-compose run --rm app npx prisma generate
    
    success "Database migrations completed"
}

# Seed production data
seed_production_data() {
    log "Seeding production data..."
    
    # Run production seed script
    docker-compose run --rm app npm run db:seed:prod
    
    success "Production data seeded"
}

# Deploy the application
deploy_application() {
    log "Deploying Floatr to ${ENVIRONMENT}..."
    
    # Update docker-compose with new image version
    export IMAGE_VERSION="${VERSION}"
    
    # Stop existing services gracefully
    docker-compose down --timeout 30
    
    # Start services with new image
    docker-compose up -d --force-recreate
    
    # Wait for health checks
    log "Waiting for services to be healthy..."
    timeout 120 bash -c 'until docker-compose ps | grep -E "(healthy|Up)"; do sleep 5; done'
    
    success "Application deployed successfully"
}

# Health check
verify_deployment() {
    log "Verifying deployment..."
    
    # Check application health
    if curl -f http://localhost:3000/health >/dev/null 2>&1; then
        success "Application is responding"
    else
        error "Application health check failed"
    fi
    
    # Check database connectivity
    if docker-compose exec database pg_isready -U floatr_user -d floatr_production >/dev/null 2>&1; then
        success "Database is connected"
    else
        error "Database connection failed"
    fi
    
    # Check critical API endpoints
    endpoints=("/api/boats" "/api/location" "/api/zones")
    for endpoint in "${endpoints[@]}"; do
        if curl -f "http://localhost:3000${endpoint}" >/dev/null 2>&1; then
            success "Endpoint ${endpoint} is working"
        else
            warning "Endpoint ${endpoint} may have issues"
        fi
    done
}

# Cleanup old images
cleanup() {
    log "Cleaning up old Docker images..."
    
    # Remove old images (keep last 3 versions)
    docker images "${IMAGE_NAME}" --format "table {{.Tag}}\t{{.ID}}" | \
        grep -v "latest" | \
        tail -n +4 | \
        awk '{print $2}' | \
        xargs -r docker rmi
    
    success "Cleanup completed"
}

# Backup before deployment
backup_database() {
    log "Creating backup before deployment..."
    
    # Create backup directory
    mkdir -p backups
    
    # Backup database
    docker-compose exec database pg_dump \
        -U floatr_user \
        -d floatr_production \
        --no-owner \
        --no-privileges \
        > "backups/floatr_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    success "Database backup created"
}

# Rollback function
rollback() {
    error "Deployment failed. Starting rollback..."
    
    # Get previous image version
    PREVIOUS_VERSION=$(docker images "${IMAGE_NAME}" --format "table {{.Tag}}" | grep -v "latest" | head -2 | tail -1)
    
    if [[ -n "${PREVIOUS_VERSION}" ]]; then
        log "Rolling back to version: ${PREVIOUS_VERSION}"
        
        # Update image version
        export IMAGE_VERSION="${PREVIOUS_VERSION}"
        
        # Restart with previous version
        docker-compose down --timeout 30
        docker-compose up -d
        
        success "Rollback completed to version ${PREVIOUS_VERSION}"
    else
        error "No previous version found for rollback"
    fi
}

# Main deployment flow
main() {
    log "Starting Floatr deployment pipeline..."
    log "Version: ${VERSION}"
    log "Environment: ${ENVIRONMENT}"
    
    # Set trap for error handling
    trap 'rollback' ERR
    
    check_prerequisites
    backup_database
    build_application
    run_tests
    push_to_registry
    run_migrations
    seed_production_data
    deploy_application
    verify_deployment
    cleanup
    
    success "🚀 Floatr deployment completed successfully!"
    log "Application is now running at: http://localhost:3000"
    log "Version deployed: ${VERSION}"
    
    # Show running containers
    docker-compose ps
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        build_application
        ;;
    "test")
        run_tests
        ;;
    "migrate")
        run_migrations
        ;;
    "seed")
        seed_production_data
        ;;
    "verify")
        verify_deployment
        ;;
    "rollback")
        rollback
        ;;
    "cleanup")
        cleanup
        ;;
    "backup")
        backup_database
        ;;
    *)
        echo "Usage: $0 {deploy|build|test|migrate|seed|verify|rollback|cleanup|backup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment pipeline (default)"
        echo "  build    - Build Docker image only"
        echo "  test     - Run tests only"
        echo "  migrate  - Run database migrations only"
        echo "  seed     - Seed production data only"
        echo "  verify   - Verify deployment only"
        echo "  rollback - Rollback to previous version"
        echo "  cleanup  - Clean up old Docker images"
        echo "  backup   - Create database backup"
        exit 1
        ;;
esac 