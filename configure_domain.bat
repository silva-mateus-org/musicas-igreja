@echo off
title Configurar Dominio Personalizado - Musicas Igreja

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir "logs"

REM Generate single daily log filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%"
set "timestamp=%HH%:%Min%:%Sec%"
set "logfile=logs\%datestamp%_sistema.log"

echo.
echo ========================================
echo  CONFIGURANDO DOMINIO PERSONALIZADO
echo ========================================
echo.

REM Log domain configuration start with section header
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo [%datestamp% %timestamp%] CONFIGURACAO DOMINIO - INICIADO >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRO: Este script precisa ser executado como Administrador!
    echo.
    echo Clique com o botao direito neste arquivo e selecione:
    echo "Executar como administrador"
    echo.
    echo [%datestamp% %timestamp%] ERRO: Script executado sem privilegios de administrador >> "%logfile%"
    echo [%datestamp% %timestamp%] ACAO NECESSARIA: Executar como administrador >> "%logfile%"
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo. >> "%logfile%"
    pause
    exit /b 1
) else (
    echo [%datestamp% %timestamp%] INFO: Executando com privilegios de administrador >> "%logfile%"
)

echo Verificando se dominio ja esta configurado...
echo [%datestamp% %timestamp%] ACAO: Verificando configuracao existente do dominio >> "%logfile%"

REM Check if domain already configured
findstr /C:"musicas-igreja.local" %SystemRoot%\System32\drivers\etc\hosts >nul
if %errorLevel% == 0 (
    echo Dominio musicas-igreja.local ja esta configurado!
    echo [%datestamp% %timestamp%] INFO: Dominio ja configurado no arquivo hosts >> "%logfile%"
    goto :test_domain
)

echo Adicionando dominio ao arquivo hosts...
echo [%datestamp% %timestamp%] ACAO: Adicionando dominio musicas-igreja.local ao hosts >> "%logfile%"

REM Backup hosts file
copy "%SystemRoot%\System32\drivers\etc\hosts" "%SystemRoot%\System32\drivers\etc\hosts.backup" >nul
if %errorLevel% == 0 (
    echo [%datestamp% %timestamp%] INFO: Backup do arquivo hosts criado >> "%logfile%"
) else (
    echo [%datestamp% %timestamp%] AVISO: Nao foi possivel criar backup do hosts >> "%logfile%"
)

REM Add domain to hosts file
echo. >> %SystemRoot%\System32\drivers\etc\hosts
echo # Musicas Igreja - Sistema local >> %SystemRoot%\System32\drivers\etc\hosts
echo 127.0.0.1	musicas-igreja.local >> %SystemRoot%\System32\drivers\etc\hosts

if %errorLevel% == 0 (
    echo Dominio configurado com sucesso!
    echo [%datestamp% %timestamp%] SUCESSO: Dominio adicionado ao arquivo hosts >> "%logfile%"
) else (
    echo ERRO: Falha ao configurar dominio!
    echo [%datestamp% %timestamp%] ERRO: Falha ao adicionar dominio ao hosts >> "%logfile%"
)

:test_domain
echo.
echo Testando configuracao...
echo [%datestamp% %timestamp%] ACAO: Testando resolucao DNS do dominio >> "%logfile%"
ping musicas-igreja.local -n 1 >nul 2>&1
if %errorLevel% == 0 (
    echo Teste OK - Dominio funcionando!
    echo [%datestamp% %timestamp%] SUCESSO: Dominio resolve corretamente >> "%logfile%"
) else (
    echo Aguarde alguns segundos para o DNS atualizar...
    echo [%datestamp% %timestamp%] AVISO: DNS pode precisar de tempo para atualizar >> "%logfile%"
    timeout /t 3 /nobreak >nul
    ping musicas-igreja.local -n 1 >nul 2>&1
    if %errorLevel% == 0 (
        echo Teste OK - Dominio funcionando apos aguardar!
        echo [%datestamp% %timestamp%] SUCESSO: Dominio funcionando apos timeout >> "%logfile%"
    ) else (
        echo [%datestamp% %timestamp%] AVISO: Dominio ainda nao resolve - pode precisar de mais tempo >> "%logfile%"
    )
)

echo.
echo ========================================
echo  CONFIGURACAO CONCLUIDA
echo ========================================
echo.
echo URLs disponiveis:
echo - http://localhost:5000
echo - http://musicas-igreja.local:5000
echo.
echo Para iniciar o sistema, execute: start_musicas_igreja.bat
echo.
echo 📁 Log consolidado em: %logfile%
echo.

REM Log completion
echo [%datestamp% %timestamp%] CONFIGURACAO DOMINIO CONCLUIDA >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo. >> "%logfile%"

pause 