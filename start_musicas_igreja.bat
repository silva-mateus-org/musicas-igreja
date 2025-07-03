@echo off
title Musicas Igreja - Sistema de Gestao
cd /d "%~dp0"

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir "logs"

REM Generate single daily log filename
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%"
set "timestamp=%HH%:%Min%:%Sec%"
set "logfile=logs\%datestamp%_sistema.log"

REM Check for administrator privileges and request if needed
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Executando com privilegios de administrador...
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo [%datestamp% %timestamp%] STARTUP MANUAL - INICIADO >> "%logfile%"
    echo [%datestamp% %timestamp%] INFO: Executando com privilegios de administrador >> "%logfile%"
    goto :setup_domain
) else (
    echo Solicitando privilegios de administrador para configurar dominio personalizado...
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo [%datestamp% %timestamp%] STARTUP MANUAL - SOLICITANDO ADMIN >> "%logfile%"
    echo [%datestamp% %timestamp%] ACAO: Solicitando privilegios de administrador >> "%logfile%"
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo. >> "%logfile%"
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:setup_domain
echo.
echo ========================================
echo  CONFIGURACAO INICIAL DO SISTEMA
echo ========================================
echo.

REM Configure custom domain
echo Configurando dominio personalizado musicas-igreja.local...
echo [%datestamp% %timestamp%] ACAO: Configurando dominio personalizado >> "%logfile%"

REM Check if domain already configured
findstr /C:"musicas-igreja.local" %SystemRoot%\System32\drivers\etc\hosts >nul
if %errorLevel% == 0 (
    echo Dominio ja configurado!
    echo [%datestamp% %timestamp%] INFO: Dominio personalizado ja configurado >> "%logfile%"
) else (
    echo Adicionando dominio ao arquivo hosts...
    echo [%datestamp% %timestamp%] ACAO: Adicionando dominio ao arquivo hosts >> "%logfile%"
    echo. >> %SystemRoot%\System32\drivers\etc\hosts
    echo # Musicas Igreja - Sistema local >> %SystemRoot%\System32\drivers\etc\hosts
    echo 127.0.0.1	musicas-igreja.local >> %SystemRoot%\System32\drivers\etc\hosts
    echo Dominio configurado com sucesso!
    echo [%datestamp% %timestamp%] SUCESSO: Dominio personalizado configurado >> "%logfile%"
)

:start_application
echo.
echo ========================================
echo  INICIANDO SERVIDOR FLASK
echo ========================================
echo.

echo [%date% %time%] Iniciando sistema Musicas Igreja...
echo Aguarde enquanto o servidor Flask e iniciado...
echo [%datestamp% %timestamp%] ACAO: Iniciando sistema Musicas Igreja >> "%logfile%"

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao foi encontrado no PATH
    echo Por favor, instale o Python ou adicione-o ao PATH do sistema
    echo [%datestamp% %timestamp%] ERRO: Python nao encontrado no PATH >> "%logfile%"
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo. >> "%logfile%"
    pause
    exit /b 1
) else (
    echo [%datestamp% %timestamp%] SUCESSO: Python encontrado >> "%logfile%"
)

REM Check if requirements are installed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    echo [%datestamp% %timestamp%] ACAO: Instalando dependencias Flask >> "%logfile%"
    pip install -r requirements.txt >> "%logfile%" 2>&1
    if errorlevel 1 (
        echo [%datestamp% %timestamp%] ERRO: Falha na instalacao das dependencias >> "%logfile%"
    ) else (
        echo [%datestamp% %timestamp%] SUCESSO: Dependencias instaladas >> "%logfile%"
    )
) else (
    echo [%datestamp% %timestamp%] INFO: Flask ja instalado >> "%logfile%"
)

echo.
echo ========================================
echo  SISTEMA MUSICAS IGREJA - INICIADO
echo ========================================
echo.
echo Acesse o sistema em:
echo http://localhost:5000
echo http://musicas-igreja.local:5000
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.
echo 📁 Logs salvos em: %logfile%
echo.

echo [%datestamp% %timestamp%] SUCESSO: Servidor Flask iniciando (modo interativo) >> "%logfile%"
echo [%datestamp% %timestamp%] ACESSO: http://localhost:5000 >> "%logfile%"
echo [%datestamp% %timestamp%] ACESSO: http://musicas-igreja.local:5000 >> "%logfile%"
echo [%datestamp% %timestamp%] SAIDA DO FLASK (MODO INTERATIVO): >> "%logfile%"
echo [%datestamp% %timestamp%] ---------------------------------------- >> "%logfile%"

REM Start Python app with output to console (log is handled in the background)
python app.py

REM Log when application stops
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "stop_timestamp=%HH%:%Min%:%Sec%"
echo [%datestamp% %stop_timestamp%] ---------------------------------------- >> "%logfile%"
echo [%datestamp% %stop_timestamp%] INFO: Servidor Flask parado pelo usuario >> "%logfile%"
echo [%datestamp% %stop_timestamp%] ======================================== >> "%logfile%"
echo. >> "%logfile%"

pause 