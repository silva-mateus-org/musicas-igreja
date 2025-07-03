@echo off
setlocal enabledelayedexpansion
title Teste - Sistema Musicas Igreja

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
echo  TESTE DO SISTEMA MUSICAS IGREJA
echo ========================================
echo.

REM Log test start with section header
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo [%datestamp% %timestamp%] TESTE SISTEMA - INICIADO >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"

echo 1. Testando se Python esta disponivel...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Python nao encontrado
    echo [%datestamp% %timestamp%] ERRO: Python nao encontrado no PATH >> "%logfile%"
    goto :end
) else (
    echo ✅ Python encontrado
    echo [%datestamp% %timestamp%] SUCESSO: Python encontrado >> "%logfile%"
)

echo.
echo 2. Testando se Flask esta instalado...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRO: Flask nao instalado
    echo Execute: pip install -r requirements.txt
    echo [%datestamp% %timestamp%] ERRO: Flask nao instalado >> "%logfile%"
    goto :end
) else (
    echo ✅ Flask instalado
    echo [%datestamp% %timestamp%] SUCESSO: Flask instalado >> "%logfile%"
)

echo.
echo 3. Testando se o servidor esta rodando na porta 5000...
netstat -an | find "5000" >nul 2>&1
if errorlevel 1 (
    echo ❌ Servidor nao esta rodando na porta 5000
    echo Execute: start_musicas_igreja.bat
    echo [%datestamp% %timestamp%] AVISO: Servidor nao rodando na porta 5000 >> "%logfile%"
) else (
    echo ✅ Servidor rodando na porta 5000
    echo [%datestamp% %timestamp%] SUCESSO: Servidor rodando na porta 5000 >> "%logfile%"
)

echo.
echo 4. Testando resolucao DNS do dominio personalizado...
ping musicas-igreja.local -n 1 >nul 2>&1
if errorlevel 1 (
    echo ❌ Dominio musicas-igreja.local nao configurado
    echo Execute como administrador: configure_domain.bat
    echo [%datestamp% %timestamp%] AVISO: Dominio personalizado nao configurado >> "%logfile%"
) else (
    echo ✅ Dominio musicas-igreja.local configurado
    echo [%datestamp% %timestamp%] SUCESSO: Dominio personalizado configurado >> "%logfile%"
)

echo.
echo 5. Testando acesso HTTP...
echo Tentando acessar http://localhost:5000...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000' -TimeoutSec 5; Write-Host '✅ Servidor respondendo (Status:' $response.StatusCode ')'; $logMsg = 'SUCESSO: Servidor HTTP respondendo (Status: ' + $response.StatusCode + ')' } catch { Write-Host '❌ Servidor nao responde ou nao esta rodando'; $logMsg = 'ERRO: Servidor HTTP nao responde' }; Add-Content -Path '%logfile%' -Value ('[%datestamp% %timestamp%] ' + $logMsg)"

REM Count tests results
set /a total_tests=5
set /a passed_tests=0

REM Check each test result
python --version >nul 2>&1
if not errorlevel 1 set /a passed_tests+=1

python -c "import flask" >nul 2>&1
if not errorlevel 1 set /a passed_tests+=1

netstat -an | find "5000" >nul 2>&1
if not errorlevel 1 set /a passed_tests+=1

ping musicas-igreja.local -n 1 >nul 2>&1
if not errorlevel 1 set /a passed_tests+=1

powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:5000' -TimeoutSec 5 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 set /a passed_tests+=1

echo.
echo ========================================
echo  RESULTADO DO TESTE
echo ========================================
echo.
echo Testes executados: %total_tests%
echo Testes passaram: %passed_tests%

if %passed_tests%==%total_tests% (
    echo Taxa de sucesso: 100%% - Sistema funcionando perfeitamente!
    echo [%datestamp% %timestamp%] RESULTADO: 100%% dos testes passaram - Sistema OK >> "%logfile%"
) else (
    echo Taxa de sucesso: %passed_tests%/%total_tests% - Alguns problemas encontrados
    echo [%datestamp% %timestamp%] RESULTADO: %passed_tests%/%total_tests% testes passaram >> "%logfile%"
)

echo.
if %passed_tests%==%total_tests% (
    echo ✅ TODOS OS TESTES PASSARAM:
    echo   • Acesse: http://localhost:5000
    echo   • Ou: http://musicas-igreja.local:5000
) else (
    echo ⚠️  ALGUNS TESTES FALHARAM:
    echo   • Consulte o arquivo SETUP_AUTOMATICO.md
    echo   • Ou execute start_musicas_igreja.bat
    echo   • Verifique os logs em: %logfile%
)

echo.
echo 📁 Log consolidado em: %logfile%
echo.

REM Log test completion
echo [%datestamp% %timestamp%] TESTE CONCLUIDO - %passed_tests%/%total_tests% testes passaram >> "%logfile%"
echo [%datestamp% %timestamp%] ======================================== >> "%logfile%"
echo. >> "%logfile%"

:end
pause 