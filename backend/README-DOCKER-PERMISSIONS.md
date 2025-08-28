# 🐳 Docker - Solução para Problemas de Permissão

## 🚨 Problema: "attempt to write a readonly database"

Este erro ocorre quando o container Docker não consegue escrever no banco de dados SQLite devido a problemas de permissões no volume montado.

### ✅ Soluções Implementadas

#### 1. **Script de Configuração Automática**
Execute antes de iniciar o container:
```bash
cd backend
./setup-docker.sh
```

#### 2. **Entrypoint Inteligente**
O `entrypoint.sh` foi atualizado para:
- ✅ Detectar problemas de permissão automaticamente
- ✅ Tentar corrigir permissões usando sudo
- ✅ Usar diretório alternativo se necessário
- ✅ Verificar conectividade antes de iniciar

#### 3. **Dockerfile Otimizado**
- ✅ Usuário `appuser` com UID/GID 1000
- ✅ Permissões sudo para comandos específicos
- ✅ Diretórios criados com permissões corretas

#### 4. **Docker Compose Atualizado**
- ✅ Volumes com flag `:rw` explícita
- ✅ Mapeamento direto para diretório local
- ✅ Variáveis de ambiente bem definidas

### 🛠️ Comandos de Diagnóstico

#### **Verificar Permissões no Host:**
```bash
ls -la data/
# Deve mostrar: drwxr-xr-x 1000 1000 data
```

#### **Verificar Logs do Container:**
```bash
docker-compose logs -f musicas-igreja
```

#### **Entrar no Container para Debug:**
```bash
docker-compose exec musicas-igreja bash
ls -la /data
id
```

#### **Verificar Status do Banco:**
```bash
docker-compose exec musicas-igreja python -c "
import sqlite3
conn = sqlite3.connect('/data/pdf_organizer.db')
cursor = conn.cursor()
cursor.execute('SELECT COUNT(*) FROM sqlite_master')
print(f'Tabelas: {cursor.fetchone()[0]}')
conn.close()
"
```

### 🔧 Solução Manual (Se Automatizada Falhar)

#### **1. Parar Container:**
```bash
docker-compose down
```

#### **2. Limpar Volumes:**
```bash
docker volume rm $(docker volume ls -q | grep musicas)
```

#### **3. Recriar Diretórios:**
```bash
rm -rf data
mkdir -p data/logs data/uploads data/organized
chmod 755 data data/logs data/uploads data/organized
```

#### **4. Ajustar Ownership (Linux/Mac):**
```bash
sudo chown -R 1000:1000 data
```

#### **5. Reiniciar:**
```bash
export SECRET_KEY='sua-chave-secreta-aqui'
docker-compose up -d
```

### 💡 Dicas de Prevenção

#### **1. Sempre Use o Script de Setup:**
```bash
./setup-docker.sh
```

#### **2. Verifique SECRET_KEY:**
```bash
echo $SECRET_KEY
# Deve retornar sua chave secreta
```

#### **3. Use .env File:**
```bash
echo "SECRET_KEY=sua-chave-secreta-aqui" > .env
```

#### **4. Monitore Logs Durante Startup:**
```bash
docker-compose up # Sem -d para ver logs em tempo real
```

### 🐛 Logs de Diagnóstico

#### **Logs Normais (Sucesso):**
```
🎵 Iniciando Organizador de Música Litúrgica...
✅ Diretório /data tem permissões adequadas
📊 Banco de dados já existe em /data/pdf_organizer.db
✅ Banco conectado em /data/pdf_organizer.db. 12 tabelas encontradas.
🚀 Iniciando aplicação...
🎵 [DEBUG] Iniciando aplicação Flask...
```

#### **Logs de Problema (Erro):**
```
❌ Diretório /data não tem permissão de escrita!
ℹ️  Tentando corrigir permissões...
⚠️  Ainda sem permissão de escrita. Tentando usar diretório alternativo...
📁 Usando diretório /app/data como fallback
```

### 🆘 Quando Tudo Falha

#### **1. Verificar Docker Version:**
```bash
docker --version
docker-compose --version
```

#### **2. Usar Volume Named:**
No `docker-compose.yml`, mude:
```yaml
volumes:
  - musicas_data:/data:rw
```

Para:
```yaml
volumes:
  - musicas_named_volume:/data
```

#### **3. Executar como Root (Temporário):**
No `Dockerfile`, comente:
```dockerfile
# USER appuser
```

### ✅ Verificação Final

Após aplicar as soluções, você deve ver:
- ✅ Container inicia sem reinicializar
- ✅ Banco de dados criado/acessível
- ✅ API responde em `http://localhost:5001`
- ✅ Logs mostram "Banco conectado"

---

**🎵 Sistema pronto para uso após resolução das permissões!**
