# ⚡ Solução Rápida para Problemas de Permissões

## 🚨 Se o container estiver em restart loop:

### **Opção 1: Script Automático (mais fácil)**
```bash
cd backend
./simple-fix-permissions.sh
```

### **Opção 2: Comandos Manuais (se script não funcionar)**
```bash
cd backend

# Parar containers
docker-compose down

# Corrigir permissões
sudo chown -R 1000:1000 ./organized

# Reiniciar
docker-compose up -d

# Verificar
docker-compose ps
curl http://localhost:5001/health
```

### **Opção 3: Modo Root (último recurso)**
```bash
cd backend
docker-compose -f docker-compose.fix-permissions.yml up -d
```

---

## 📋 Verificar se funcionou:

```bash
# Container deve estar "Up" (não "Restarting")
docker-compose ps

# Health check deve responder
curl http://localhost:5001/health

# Se ainda não funcionar, ver logs:
docker-compose logs musicas-igreja --tail=50
```

---

## 🎯 O problema era:

- Container roda como usuário `appuser` (UID 1000)
- Volume `./organized` tinha permissões diferentes
- Container não conseguia escrever → restart loop

## ✅ A solução:

- Ajustar permissões do diretório host para UID 1000
- Permite que o container escreva normalmente
- Sistema funciona sem problemas

---

**Geralmente a Opção 1 resolve tudo em ~30 segundos! 🚀**
