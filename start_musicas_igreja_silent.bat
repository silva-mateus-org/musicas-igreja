@echo off
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

REM Log startup attempt with section header
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo [%datestamp% %timestamp%] AUTO-START SILENCIOSO - INICIADO >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"

REM Check if already running
tasklist /FI "IMAGENAME eq python.exe" | find /I "python.exe" > nul
if not errorlevel 1 (
    echo [%datestamp% %timestamp%] AVISO: Python ja em execucao, verificando porta 5000... >> "%logfile%"
    
    netstat -an | find ":5000" > nul
    if not errorlevel 1 (
        echo [%datestamp% %timestamp%] INFO: Sistema ja rodando na porta 5000 - nenhuma acao necessaria >> "%logfile%"
        echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
        echo. >> "%logfile%"
        exit /b 0
    )
)

REM Check Python availability
python --version >nul 2>&1
if errorlevel 1 (
    echo [%datestamp% %timestamp%] ERRO: Python nao encontrado no PATH >> "%logfile%"
    echo [%datestamp% %timestamp%] ACAO NECESSARIA: Instalar Python ou adicionar ao PATH >> "%logfile%"
    echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
    echo. >> "%logfile%"
    exit /b 1
)

echo [%datestamp% %timestamp%] INFO: Python encontrado e disponivel >> "%logfile%"

REM Check Flask installation
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo [%datestamp% %timestamp%] AVISO: Flask nao instalado, instalando dependencias... >> "%logfile%"
    pip install -r requirements.txt >> "%logfile%" 2>&1
    if errorlevel 1 (
        echo [%datestamp% %timestamp%] ERRO: Falha na instalacao das dependencias >> "%logfile%"
        echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
        echo. >> "%logfile%"
        exit /b 1
    )
    echo [%datestamp% %timestamp%] SUCESSO: Dependencias instaladas >> "%logfile%"
)

REM Start Flask application with output redirected to log
echo [%datestamp% %timestamp%] ACAO: Iniciando aplicacao Flask em segundo plano... >> "%logfile%"
echo [%datestamp% %timestamp%] SAIDA DO FLASK INICIANDO: >> "%logfile%"
echo [%datestamp% %timestamp%] ---------------------------------------- >> "%logfile%"

REM Start Python app with output redirected to same log file
start /MIN "" cmd /c "python app.py >> \"%logfile%\" 2>&1"

REM Wait and verify startup
timeout /t 5 /nobreak >nul
netstat -an | find ":5000" > nul
if not errorlevel 1 (
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "end_timestamp=%HH%:%Min%:%Sec%"
    echo [%datestamp% %end_timestamp%] ---------------------------------------- >> "%logfile%"
    echo [%datestamp% %end_timestamp%] SUCESSO: Musicas Igreja iniciado na porta 5000 >> "%logfile%"
    echo [%datestamp% %end_timestamp%] ACESSO: http://localhost:5000 >> "%logfile%"
    echo [%datestamp% %end_timestamp%] ACESSO: http://musicas-igreja.local:5000 >> "%logfile%"
) else (
    for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
    set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
    set "end_timestamp=%HH%:%Min%:%Sec%"
    echo [%datestamp% %end_timestamp%] ---------------------------------------- >> "%logfile%"
    echo [%datestamp% %end_timestamp%] ERRO: Falha ao iniciar - porta 5000 nao ativa >> "%logfile%"
    echo [%datestamp% %end_timestamp%] SUGESTAO: Verificar saida do Flask acima >> "%logfile%"
)

echo [%datestamp% %end_timestamp%] ======================================== >> "%logfile%"
echo. >> "%logfile%"

exit 