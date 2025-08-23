# 📁 Setup de Produção - Diretório Organized

## 🚨 Atenção: Arquivos PDF Necessários

Este diretório contém a estrutura para organizar os arquivos PDF de músicas, mas **os arquivos PDF não estão versionados no Git** devido ao tamanho.

## 🔧 Setup em Produção

### **Opção 1: Cópia Manual**
Se você já tem os PDFs organizados:
```bash
# No servidor de produção
rsync -av /path/to/existing/organized/ ./backend/organized/
```

### **Opção 2: Upload via Interface**
1. Use a interface web da aplicação
2. Faça upload dos PDFs categoria por categoria
3. A aplicação organizará automaticamente

### **Opção 3: Backup/Restore**
```bash
# Criar backup (servidor antigo)
tar -czf organized-backup.tar.gz organized/

# Restaurar (servidor novo)  
tar -xzf organized-backup.tar.gz -C backend/
```

## 🎯 Verificação

Para verificar se está funcionando:

```bash
# Deve mostrar ~269 arquivos
find backend/organized -name "*.pdf" | wc -l

# Deve mostrar estrutura de categorias
ls -la backend/organized/
```

## ⚠️ Importante

**SEM os arquivos PDF, a aplicação funcionará mas:**
- Não haverá arquivos para download
- Listas de músicas ficarão vazias  
- Upload funcionará normalmente

**COM os arquivos PDF:**
- ✅ Aplicação totalmente funcional
- ✅ Downloads disponíveis
- ✅ Banco de dados populado

## 🐳 Docker

O diretório é mapeado como volume:
```yaml
volumes:
  - ./organized:/app/organized
```

**Certifique-se de que o diretório `./backend/organized/` contenha os PDFs antes de subir os containers!**
