#!/bin/bash

echo "🔧 Script Simples de Correção de Permissões"
echo "==========================================="

# Para containers
docker-compose down || true

echo "🔍 Verificando diretório organized..."
if [ -d "./organized" ]; then
    echo "✅ Diretório exists"
    echo "📋 Permissões atuais:"
    ls -la ./organized
    
    echo "🔧 Corrigindo permissões..."
    sudo chown -R 1000:1000 ./organized
    sudo chmod -R 755 ./organized
    
    echo "✅ Permissões corrigidas:"
    ls -la ./organized
else
    echo "❌ Diretório ./organized não encontrado, criando..."
    mkdir -p ./organized
    sudo chown -R 1000:1000 ./organized
    sudo chmod -R 755 ./organized
fi

echo "🗃️ Corrigindo volume Docker..."
docker run --rm -v musicas_data:/data alpine sh -c "
    chown -R 1000:1000 /data 2>/dev/null || true
    chmod -R 755 /data 2>/dev/null || true
    echo 'Volume permissions fixed'
" 2>/dev/null || echo "Volume não existe (será criado automaticamente)"

echo "🚀 Reiniciando sistema..."
docker-compose up -d

echo "⏱️ Aguardando 20 segundos..."
sleep 20

echo "📊 Status final:"
docker-compose ps

echo "🎯 Teste de saúde:"
if curl -s http://localhost:5001/health >/dev/null 2>&1; then
    echo "✅ Sistema funcionando!"
    echo "🎉 Problema de permissões resolvido!"
else
    echo "⚠️ Sistema ainda não respondendo, verificando logs..."
    docker-compose logs --tail=20 musicas-igreja
fi

echo ""
echo "✅ Script finalizado!"
