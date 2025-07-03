@echo off
title Parar Sistema - Musicas Igreja
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

echo.
echo ========================================
echo  PARANDO SISTEMA MUSICAS IGREJA
echo ========================================
echo.

REM Log stop operation start
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo [%datestamp% %timestamp%] PARAR SISTEMA - INICIADO >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"

echo Verificando se o sistema esta rodando...
echo [%datestamp% %timestamp%] ACAO: Verificando processos do sistema >> "%logfile%"

REM Check if Flask is running on port 5000
netstat -an | find ":5000" >nul 2>&1
if errorlevel 1 (
    echo ❌ Sistema nao esta rodando na porta 5000
    echo [%datestamp% %timestamp%] INFO: Sistema nao encontrado na porta 5000 >> "%logfile%"
    goto :check_python_processes
) else (
    echo ✅ Sistema detectado rodando na porta 5000
    echo [%datestamp% %timestamp%] INFO: Sistema detectado na porta 5000 >> "%logfile%"
)

:check_python_processes
echo.
echo Procurando processos Python relacionados...

REM Count Python processes
set /a python_count=0
for /f %%i in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV ^| find /c "python.exe"') do set python_count=%%i
for /f %%i in ('tasklist /FI "IMAGENAME eq pythonw.exe" /FO CSV ^| find /c "pythonw.exe"') do set /a python_count+=%%i

echo [%datestamp% %timestamp%] INFO: Encontrados %python_count% processos Python >> "%logfile%"

if %python_count%==0 (
    echo ❌ Nenhum processo Python encontrado
    echo [%datestamp% %timestamp%] INFO: Nenhum processo Python ativo >> "%logfile%"
    goto :end_no_action
)

echo ✅ Encontrados %python_count% processos Python
echo.

echo Tentando parar processos relacionados ao Flask...
echo [%datestamp% %timestamp%] ACAO: Encerrando processos Python >> "%logfile%"

REM Try to kill Python processes gracefully first
set /a killed_count=0

REM Kill python.exe processes
for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV /NH 2^>nul') do (
    if not "%%i"=="" (
        set /a killed_count+=1
        echo Encerrando processo Python PID %%i...
        taskkill /PID %%i /F >nul 2>&1
        if not errorlevel 1 (
            echo [%datestamp% %timestamp%] SUCESSO: Processo Python PID %%i encerrado >> "%logfile%"
        ) else (
            echo [%datestamp% %timestamp%] AVISO: Falha ao encerrar PID %%i >> "%logfile%"
        )
    )
)

REM Kill pythonw.exe processes
for /f "tokens=2 delims=," %%i in ('tasklist /FI "IMAGENAME eq pythonw.exe" /FO CSV /NH 2^>nul') do (
    if not "%%i"=="" (
        set /a killed_count+=1
        echo Encerrando processo PythonW PID %%i...
        taskkill /PID %%i /F >nul 2>&1
        if not errorlevel 1 (
            echo [%datestamp% %timestamp%] SUCESSO: Processo PythonW PID %%i encerrado >> "%logfile%"
        ) else (
            echo [%datestamp% %timestamp%] AVISO: Falha ao encerrar PID %%i >> "%logfile%"
        )
    )
)

REM Alternative method - kill by process name
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM pythonw.exe /F >nul 2>&1

echo.
echo Verificando se a porta 5000 foi liberada...
timeout /t 2 /nobreak >nul

netstat -an | find ":5000" >nul 2>&1
if errorlevel 1 (
    echo ✅ Porta 5000 liberada - Sistema parado com sucesso!
    echo [%datestamp% %timestamp%] SUCESSO: Sistema parado - porta 5000 liberada >> "%logfile%"
    goto :end_success
) else (
    echo ⚠️  Porta 5000 ainda ocupada - pode haver outros processos
    echo [%datestamp% %timestamp%] AVISO: Porta 5000 ainda ocupada >> "%logfile%"
)

goto :end_success

:end_no_action
echo.
echo ========================================
echo  NENHUMA ACAO NECESSARIA
echo ========================================
echo.
echo O sistema nao estava rodando.
echo [%datestamp% %timestamp%] RESULTADO: Nenhuma acao necessaria >> "%logfile%"
goto :end_log

:end_success
echo.
echo ========================================
echo  SISTEMA PARADO COM SUCESSO
echo ========================================
echo.
echo Processos encerrados: %killed_count%
echo Para iniciar novamente: start_musicas_igreja.bat
echo.
echo [%datestamp% %timestamp%] RESULTADO: %killed_count% processos encerrados >> "%logfile%"

:end_log
REM Log completion
echo [%datestamp% %timestamp%] PARAR SISTEMA CONCLUIDO >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo. >> "%logfile%"

echo 📁 Log salvo em: %logfile%
echo.
pause 