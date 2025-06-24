#!/bin/bash

# Floatr Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
DB_HOST="database"
DB_PORT="5432"
DB_NAME="floatr_production"
DB_USER="floatr_user"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Function to create database backup
create_backup() {
    local backup_file="${BACKUP_DIR}/floatr_backup_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    log "Creating database backup..."
    
    # Check if database is accessible
    if ! pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" > /dev/null 2>&1; then
        error "Database is not accessible"
    fi
    
    # Create the backup
    pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --no-owner \
        --no-privileges \
        --create \
        --clean \
        --if-exists \
        --verbose \
        > "${backup_file}"
    
    if [ $? -eq 0 ]; then
        # Compress the backup
        gzip "${backup_file}"
        
        # Verify the backup
        if [ -f "${compressed_file}" ]; then
            local file_size=$(stat -c%s "${compressed_file}")
            local file_size_mb=$((file_size / 1024 / 1024))
            
            success "Backup created: ${compressed_file} (${file_size_mb}MB)"
            
            # Test backup integrity
            if gunzip -t "${compressed_file}" > /dev/null 2>&1; then
                success "Backup integrity verified"
            else
                warning "Backup integrity check failed"
            fi
        else
            error "Backup file not found after compression"
        fi
    else
        error "Backup creation failed"
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm -f "${file}"
        deleted_count=$((deleted_count + 1))
        log "Deleted old backup: $(basename "${file}")"
    done < <(find "${BACKUP_DIR}" -name "floatr_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print0)
    
    if [ ${deleted_count} -eq 0 ]; then
        log "No old backups to clean up"
    else
        success "Cleaned up ${deleted_count} old backup(s)"
    fi
}

# Function to upload backup to cloud storage (optional)
upload_to_cloud() {
    local backup_file="$1"
    
    # AWS S3 upload (uncomment and configure if needed)
    # if [ -n "${AWS_S3_BUCKET}" ]; then
    #     log "Uploading backup to AWS S3..."
    #     aws s3 cp "${backup_file}" "s3://${AWS_S3_BUCKET}/backups/"
    #     success "Backup uploaded to S3"
    # fi
    
    # Google Cloud Storage upload (uncomment and configure if needed)
    # if [ -n "${GCS_BUCKET}" ]; then
    #     log "Uploading backup to Google Cloud Storage..."
    #     gsutil cp "${backup_file}" "gs://${GCS_BUCKET}/backups/"
    #     success "Backup uploaded to GCS"
    # fi
    
    log "Cloud upload skipped (not configured)"
}

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        local color="good"
        local emoji="✅"
        
        if [ "${status}" != "success" ]; then
            color="danger"
            emoji="❌"
        fi
        
        curl -X POST "${SLACK_WEBHOOK_URL}" \
            -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"${color}\",
                    \"title\": \"${emoji} Floatr Database Backup\",
                    \"text\": \"${message}\",
                    \"footer\": \"Floatr Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" > /dev/null 2>&1
    fi
    
    # Email notification (using SendGrid)
    if [ -n "${SENDGRID_API_KEY}" ] && [ -n "${BACKUP_NOTIFICATION_EMAIL}" ]; then
        local subject="Floatr Backup ${status}"
        
        curl -X POST "https://api.sendgrid.com/v3/mail/send" \
            -H "Authorization: Bearer ${SENDGRID_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{
                \"personalizations\": [{
                    \"to\": [{\"email\": \"${BACKUP_NOTIFICATION_EMAIL}\"}]
                }],
                \"from\": {\"email\": \"${FROM_EMAIL:-noreply@floatr.app}\"},
                \"subject\": \"${subject}\",
                \"content\": [{
                    \"type\": \"text/plain\",
                    \"value\": \"${message}\"
                }]
            }" > /dev/null 2>&1
    fi
}

# Main backup process
main() {
    local start_time=$(date +%s)
    
    log "Starting Floatr database backup process..."
    
    try {
        # Create the backup
        create_backup
        
        # Get the latest backup file
        local latest_backup=$(ls -t "${BACKUP_DIR}"/floatr_backup_*.sql.gz | head -1)
        
        # Upload to cloud if configured
        upload_to_cloud "${latest_backup}"
        
        # Clean up old backups
        cleanup_old_backups
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        local success_message="Database backup completed successfully in ${duration} seconds. File: $(basename "${latest_backup}")"
        success "${success_message}"
        send_notification "success" "${success_message}"
        
    } catch {
        local error_message="Database backup failed: $1"
        error "${error_message}"
        send_notification "failed" "${error_message}"
    }
}

# Error handling
try() {
    "$@"
}

catch() {
    case $? in
        0) ;;  # Success
        *) "$@" ;;  # Error
    esac
}

# Check if running in cron mode
if [ "$1" = "cron" ]; then
    # Redirect output to log file for cron
    exec > "/var/log/backup.log" 2>&1
    
    # Add to crontab if not already present
    if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
        (crontab -l 2>/dev/null; echo "${BACKUP_SCHEDULE:-0 2 * * *} /backup.sh cron") | crontab -
        log "Backup cron job installed"
    fi
fi

# Run the backup
main "$@" 