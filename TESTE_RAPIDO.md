# 🎵 Teste Rápido - Sistema Músicas Igreja

## ✅ Como Testar se Tudo Está Funcionando

### 1. Teste Manual do Sistema

**Execute este comando:**
```cmd
.\test_setup.bat
```

**Resultado esperado:**
- ✅ Python encontrado
- ✅ Flask instalado  
- ✅ Servidor rodando na porta 5000
- ✅ Domínio musicas-igreja.local configurado
- ✅ Servidor respondendo

### 2. Configurar Domínio Personalizado

**Opção A - Script Corrigido (Simples):**
```cmd
configure_domain.bat
```
- Clique com o botão direito e "Executar como administrador"

**Opção B - Script Principal:**
```cmd
start_musicas_igreja.bat
```
- Clique com o botão direito e "Executar como administrador"

### 3. Testar URLs

Após configurar, teste no navegador:
- `http://localhost:5000` ✅
- `http://musicas-igreja.local:5000` ✅

### 4. Configurar Inicialização Automática

**Passo a passo:**
1. Pressione `Win + R`
2. Digite: `shell:startup`
3. Copie `start_musicas_igreja_silent.bat` para esta pasta
4. Reinicie o computador para testar

### 5. Verificar Auto-Start

**Após reiniciar, verifique:**
```cmd
netstat -an | find "5000"
```

**Se aparecer algo como:** `TCP 0.0.0.0:5000 0.0.0.0:0 LISTENING`
✅ **Sistema iniciou automaticamente!**

## 🔧 Solução de Problemas

### Erro de PowerShell corrigido ✅
- Agora usa script batch simples
- Sem caracteres especiais problemáticos

### Se o domínio não funcionar:
```cmd
ipconfig /flushdns
ping musicas-igreja.local
```

### Se não iniciar automaticamente:
1. Verifique se o arquivo está em: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`
2. Teste manualmente: `start_musicas_igreja_silent.bat`

## 📝 Sistema de Logs Diários

Execute `ver_logs.bat` para visualizar logs organizados por data:
- `YYYY-MM-DD_musicas_igreja.log` - Auto-start
- `YYYY-MM-DD_teste_sistema.log` - Testes
- `YYYY-MM-DD_configurar_dominio.log` - Configuração

## 🎯 URLs Finais

- **Local**: http://localhost:5000
- **Personalizada**: http://musicas-igreja.local:5000
- **Rede**: http://192.168.15.11:5000

---

**✅ Pronto!** Seu sistema agora tem URL personalizada e inicia automaticamente! 