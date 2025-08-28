#!/bin/bash
set -e

# Função de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "🎵 Iniciando Organizador de Música Litúrgica..."

# Criar diretórios necessários se não existirem
mkdir -p /data/logs /data/uploads /data/organized

# Verificar e corrigir permissões do diretório /data
log "🔧 Verificando permissões do diretório /data..."
if [ ! -w /data ]; then
    log "❌ Diretório /data não tem permissão de escrita!"
    log "ℹ️  Tentando corrigir permissões..."
    
    # Tentar corrigir como root (será executado como appuser mas com sudo se necessário)
    sudo chown -R appuser:appuser /data 2>/dev/null || true
    sudo chmod -R 755 /data 2>/dev/null || true
    chmod 755 /data /data/logs /data/uploads /data/organized 2>/dev/null || true
    
    if [ ! -w /data ]; then
        log "⚠️  Ainda sem permissão de escrita. Tentando usar diretório alternativo..."
        export DATABASE_PATH="/app/data/pdf_organizer.db"
        export UPLOAD_FOLDER="/app/data/uploads"
        export LOG_FOLDER="/app/data/logs"
        mkdir -p /app/data/logs /app/data/uploads
        chmod 755 /app/data /app/data/logs /app/data/uploads 2>/dev/null || true
        log "📁 Usando diretório /app/data como fallback"
    else
        log "✅ Permissões corrigidas com sucesso"
    fi
else
    chmod 755 /data /data/logs /data/uploads /data/organized 2>/dev/null || true
    log "✅ Diretório /data tem permissões adequadas"
fi

# Verificar se o banco de dados existe; se não, tentar copiar snapshot do repositório antes de inicializar
DB_PATH="${DATABASE_PATH:-/data/pdf_organizer.db}"
if [ ! -f "$DB_PATH" ]; then
    # Primeiro tenta usar um DB presente em /app/data (repo) ou /app (repo root)
    if [ -f "/app/data/pdf_organizer.db" ]; then
        log "📦 DB encontrado em /app/data do repositório. Copiando para $DB_PATH..."
        cp -f /app/data/pdf_organizer.db "$DB_PATH"
        chmod 644 "$DB_PATH" 2>/dev/null || true
        log "✅ DB copiado para $DB_PATH"
    elif [ -f "/app/pdf_organizer.db" ]; then
        log "📦 DB encontrado em /app do repositório. Copiando para $DB_PATH..."
        cp -f /app/pdf_organizer.db "$DB_PATH"
        chmod 644 "$DB_PATH" 2>/dev/null || true
        log "✅ DB copiado para $DB_PATH"
    fi

    if [ ! -f "$DB_PATH" ]; then
        log "📊 Banco de dados não encontrado. Inicializando estrutura..."
        # Verificar se o diretório pai existe e tem permissão de escrita
        DB_DIR=$(dirname "$DB_PATH")
        if [ ! -w "$DB_DIR" ]; then
            log "❌ Diretório $DB_DIR não tem permissão de escrita!"
            exit 1
        fi
        
        python -c "
import sys
sys.path.insert(0, '/app')
from app import init_db
init_db()
print('✅ Banco de dados inicializado com sucesso!')
"
        
        # Verificar se o banco foi criado com sucesso
        if [ ! -f "$DB_PATH" ]; then
            log "❌ Falha ao criar banco de dados em $DB_PATH"
            exit 1
        fi
        
        chmod 644 "$DB_PATH" 2>/dev/null || true
        log "✅ Banco de dados criado e configurado em $DB_PATH"
    fi
else
    log "📊 Banco de dados já existe em $DB_PATH. Pulando inicialização."
fi

# Verificar conectividade do banco
log "🔍 Verificando conectividade do banco de dados..."
python -c "
import sys
import os
sys.path.insert(0, '/app')
import sqlite3

db_path = os.environ.get('DATABASE_PATH', '/data/pdf_organizer.db')
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM sqlite_master WHERE type=\"table\"')
    tables = cursor.fetchone()[0]
    conn.close()
    print(f'✅ Banco conectado em {db_path}. {tables} tabelas encontradas.')
except Exception as e:
    print(f'❌ Erro ao conectar ao banco em {db_path}: {e}')
    sys.exit(1)
"

# Verificar dependências Python
log "📦 Verificando dependências Python..."
python -c "
packages = ['flask', 'bcrypt', 'pypdf']
missing = []
for pkg in packages:
    try:
        __import__(pkg)
    except ImportError:
        missing.append(pkg)

if missing:
    print(f'❌ Dependências faltando: {missing}')
    exit(1)
else:
    print('✅ Todas as dependências estão instaladas.')
"

# Verificar configurações obrigatórias
log "⚙️  Verificando configurações..."

# Verificar SECRET_KEY
if [ -z "${SECRET_KEY}" ] || [ "${SECRET_KEY}" = "your-secret-key-change-this" ]; then
    log "⚠️  WARNING: SECRET_KEY não configurada ou usando valor padrão!"
    log "   Configure a variável SECRET_KEY para produção."
fi

# Configurar variáveis de ambiente padrão se não definidas
export FLASK_ENV=${FLASK_ENV:-production}
export DATABASE_PATH=${DATABASE_PATH:-/data/pdf_organizer.db}
export UPLOAD_FOLDER=${UPLOAD_FOLDER:-/data/uploads}
export ORGANIZED_FOLDER=${ORGANIZED_FOLDER:-/data/organized}
export LOG_FOLDER=${LOG_FOLDER:-/data/logs}

log "📝 Configurações:"
log "   FLASK_ENV: $FLASK_ENV"
log "   DATABASE_PATH: $DATABASE_PATH"
log "   UPLOAD_FOLDER: $UPLOAD_FOLDER"
log "   ORGANIZED_FOLDER: $ORGANIZED_FOLDER"
log "   LOG_FOLDER: $LOG_FOLDER"

# Executar comando passado como argumento
log "🚀 Iniciando aplicação..."
exec "$@"