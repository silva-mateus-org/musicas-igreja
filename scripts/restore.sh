#!/bin/bash

# Restore Script - Musicas Igreja (MySQL version)
# Restores MySQL database and organized PDFs from backup
#
# Usage:
#   ./restore.sh                         # Restore latest backup
#   ./restore.sh latest                  # Restore latest backup
#   ./restore.sh 20260225                # Restore by date
#   ./restore.sh /path/to/file.tar.gz   # Restore specific file

set -e

# ============================================
# CONFIGURATION
# ============================================

BACKUP_DIR="${BACKUP_DIR:-/home/thi_s/backups/musicas-igreja}"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-mysql}"
API_CONTAINER="${API_CONTAINER:-musicas-igreja-api}"

DB_NAME="musicas_igreja"
DB_USER="musicas_user"
DB_PASSWORD="${DB_PASSWORD:-}"

# ============================================
# HELPERS
# ============================================

log()      { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
log_info() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [INFO] $1"; }
log_ok()   { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [OK]   $1"; }
log_err()  { echo "[$(date +'%Y-%m-%d %H:%M:%S')] [ERR]  $1" >&2; }

# ============================================
# RESOLVE BACKUP FILE
# ============================================

BACKUP_ARG="${1:-latest}"
BACKUP_FILE=""

if [ "$BACKUP_ARG" = "latest" ]; then
    if [ -L "$BACKUP_DIR/latest.tar.gz" ]; then
        BACKUP_FILE=$(readlink -f "$BACKUP_DIR/latest.tar.gz")
    else
        BACKUP_FILE=$(ls -1t "$BACKUP_DIR/daily/"*.tar.gz 2>/dev/null | head -1)
    fi
elif [ -f "$BACKUP_ARG" ]; then
    BACKUP_FILE="$BACKUP_ARG"
elif [ -f "$BACKUP_DIR/daily/musicas_backup_${BACKUP_ARG}.tar.gz" ]; then
    BACKUP_FILE="$BACKUP_DIR/daily/musicas_backup_${BACKUP_ARG}.tar.gz"
else
    BACKUP_FILE=$(ls -1t "$BACKUP_DIR/daily/"*"${BACKUP_ARG}"*.tar.gz 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    log_err "Backup not found: ${BACKUP_ARG}"
    echo ""
    echo "Available backups:"
    ls -lh "$BACKUP_DIR/daily/"*.tar.gz 2>/dev/null || echo "  (none)"
    echo ""
    echo "Usage: $0 [latest|YYYYMMDD|/path/to/file.tar.gz]"
    exit 1
fi

# ============================================
# PRE-CHECKS
# ============================================

if ! docker info > /dev/null 2>&1; then
    log_err "Docker is not running"
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
    log_err "MySQL container '${MYSQL_CONTAINER}' is not running"
    exit 1
fi

# ============================================
# EXTRACT
# ============================================

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

log "Restoring from: $(basename "$BACKUP_FILE")"

log_info "Extracting archive..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

if [ -f "$TEMP_DIR/MANIFEST.txt" ]; then
    echo ""
    cat "$TEMP_DIR/MANIFEST.txt"
    echo ""
fi

echo "WARNING: This will overwrite the current database and organized files."
read -p "Continue? [y/N]: " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Restore cancelled"
    exit 0
fi

# ============================================
# 1. RESTORE DATABASE
# ============================================

if [ -f "$TEMP_DIR/database.sql" ]; then
    log_info "Restoring MySQL database '${DB_NAME}'..."

    IMPORT_CMD="mysql -u${DB_USER} ${DB_NAME}"
    if [ -n "$DB_PASSWORD" ]; then
        IMPORT_CMD="mysql -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"
    fi

    docker exec -i "$MYSQL_CONTAINER" sh -c "$IMPORT_CMD" < "$TEMP_DIR/database.sql"

    log_ok "Database restored"
else
    log_err "database.sql not found in backup"
fi

# ============================================
# 2. RESTORE ORGANIZED PDFs
# ============================================

if [ -d "$TEMP_DIR/organized" ]; then
    PDF_COUNT=$(find "$TEMP_DIR/organized" -name "*.pdf" 2>/dev/null | wc -l)
    log_info "Restoring organized PDFs (${PDF_COUNT} files)..."

    if docker ps --format '{{.Names}}' | grep -q "^${API_CONTAINER}$"; then
        docker cp "$TEMP_DIR/organized" "${API_CONTAINER}:/app/organized"
        log_ok "PDFs restored to container"
    else
        log_err "API container '${API_CONTAINER}' is not running - cannot restore PDFs"
        log_info "Files extracted to: ${TEMP_DIR}/organized (copy manually before temp cleanup)"
        read -p "Press Enter to continue (temp dir will be deleted)..."
    fi
else
    log_info "No organized folder in backup"
fi

# ============================================
# 3. RESTART API
# ============================================

if docker ps --format '{{.Names}}' | grep -q "^${API_CONTAINER}$"; then
    log_info "Restarting API container..."
    docker restart "$API_CONTAINER"
    sleep 5

    if docker ps --format '{{.Names}}' | grep -q "^${API_CONTAINER}$"; then
        log_ok "API container restarted"
    else
        log_err "API container failed to restart"
    fi
fi

# ============================================
# SUMMARY
# ============================================

echo ""
log "Restore complete"
log_info "Backup used: $(basename "$BACKUP_FILE")"
log_info "Database:    restored"
log_info "PDFs:        ${PDF_COUNT:-0} files"
