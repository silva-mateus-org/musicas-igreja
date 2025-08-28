#!/bin/bash

# Script de configuração para preparar ambiente Docker
echo "🎵 Configurando ambiente Docker para Sistema de Músicas da Igreja"

# Criar diretórios necessários no host
echo "📁 Criando diretórios de dados..."
mkdir -p data/logs data/uploads data/organized
mkdir -p organized config

# Configurar permissões (UID/GID 1000 para compatibilidade com container)
echo "🔧 Configurando permissões..."
chmod 755 data data/logs data/uploads data/organized
chmod 755 organized

# Se rodando como root, ajustar ownership para UID/GID 1000
if [ "$(id -u)" -eq 0 ]; then
    echo "⚙️  Ajustando ownership (executando como root)..."
    chown -R 1000:1000 data organized
fi

# Verificar se SECRET_KEY está definida
if [ -z "${SECRET_KEY}" ]; then
    echo "⚠️  AVISO: SECRET_KEY não está definida!"
    echo "   Defina com: export SECRET_KEY='sua-chave-secreta-aqui'"
    echo "   Ou crie um arquivo .env com SECRET_KEY=sua-chave-secreta-aqui"
fi

# Verificar se docker-compose está disponível
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo "❌ Docker ou docker-compose não encontrado!"
    echo "   Instale o Docker Desktop primeiro: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Configuração concluída!"
echo ""
echo "🚀 Para iniciar o sistema:"
echo "   export SECRET_KEY='sua-chave-secreta-aqui'"
echo "   docker-compose up -d"
echo ""
echo "📊 Para verificar logs:"
echo "   docker-compose logs -f musicas-igreja"
echo ""
echo "🔧 Para parar o sistema:"
echo "   docker-compose down"
