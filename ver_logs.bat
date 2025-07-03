@echo off
title Visualizador de Logs - Sistema Musicas Igreja
cd /d "%~dp0"

REM Check if logs directory exists
if not exist "logs" (
    echo.
    echo ========================================
    echo  NENHUM LOG ENCONTRADO
    echo ========================================
    echo.
    echo O diretorio de logs nao foi criado ainda.
    echo Execute algum script do sistema primeiro:
    echo - start_musicas_igreja.bat
    echo - test_setup.bat
    echo - configure_domain.bat
    echo.
    pause
    exit /b
)

REM Generate current date for default
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "today=%YYYY%-%MM%-%DD%"

:main_menu
cls
echo.
echo ========================================
echo  VISUALIZADOR DE LOGS - MUSICAS IGREJA
echo ========================================
echo.
echo Data atual: %today%
echo Diretorio de logs: %CD%\logs
echo.

REM Check if today's log file exists
set "today_log=logs\%today%_sistema.log"
if exist "%today_log%" (
    set "today_exists=Sim"
) else (
    set "today_exists=Nao"
)

REM Count total log files
set /a total_logs=0
for %%f in ("logs\*_sistema.log") do (
    if exist "%%f" set /a total_logs+=1
)

echo Log de hoje (%today%): %today_exists%
echo Total de logs diarios: %total_logs% arquivo(s)
echo.

echo Opcoes disponiveis:
echo.
echo [1] Ver logs de hoje (%today%)
echo [2] Ver logs de data especifica
echo [3] Listar todos os arquivos de log
echo [4] Ver log mais recente
echo [5] Limpar logs antigos (manter ultimos 7 dias)
echo [6] Abrir pasta de logs no Explorer
echo [0] Sair
echo.

set /p choice="Escolha uma opcao (0-6): "

if "%choice%"=="1" goto :view_today
if "%choice%"=="2" goto :view_date
if "%choice%"=="3" goto :list_all
if "%choice%"=="4" goto :view_recent
if "%choice%"=="5" goto :cleanup_logs
if "%choice%"=="6" goto :open_folder
if "%choice%"=="0" goto :exit
goto :main_menu

:view_today
cls
echo.
echo ========================================
echo  LOGS DE HOJE (%today%)
echo ========================================
echo.

set "today_log=logs\%today%_sistema.log"
if exist "%today_log%" (
    echo.
    echo [LOG UNICO DIARIO] %today%_sistema.log
    echo ----------------------------------------
    type "%today_log%"
    echo ----------------------------------------
    echo.
) else (
    echo Nenhum log encontrado para hoje.
    echo Execute algum script do sistema para gerar logs.
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto :main_menu

:view_date
cls
echo.
echo ========================================
echo  VER LOGS DE DATA ESPECIFICA
echo ========================================
echo.
echo Formato da data: YYYY-MM-DD
echo Exemplo: 2024-12-19
echo.
set /p target_date="Digite a data (ou Enter para cancelar): "

if "%target_date%"=="" goto :main_menu

cls
echo.
echo ========================================
echo  LOGS DE %target_date%
echo ========================================
echo.

set "target_log=logs\%target_date%_sistema.log"
if exist "%target_log%" (
    echo.
    echo [LOG UNICO DIARIO] %target_date%_sistema.log
    echo ----------------------------------------
    type "%target_log%"
    echo ----------------------------------------
    echo.
) else (
    echo Nenhum log encontrado para a data %target_date%.
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto :main_menu

:list_all
cls
echo.
echo ========================================
echo  TODOS OS ARQUIVOS DE LOG
echo ========================================
echo.

if %total_logs%==0 (
    echo Nenhum arquivo de log encontrado.
) else (
    echo Data         Tamanho    Nome do Arquivo
    echo ----------   ---------  ---------------------------
    
    for %%f in ("logs\*_sistema.log") do (
        if exist "%%f" (
            set "filename=%%~nxf"
            set "filesize=%%~zf"
            
            REM Extract date from filename
            for /f "tokens=1 delims=_" %%a in ("%%~nf") do (
                set "logdate=%%a"
            )
            
            REM Format file size
            if %%~zf LSS 1024 (
                echo !logdate!   %%~zf B     %%~nxf
            ) else (
                set /a sizeKB=%%~zf/1024
                echo !logdate!   !sizeKB! KB    %%~nxf
            )
        )
    )
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto :main_menu

:view_recent
cls
echo.
echo ========================================
echo  LOG MAIS RECENTE
echo ========================================
echo.

REM Find the most recent log file (sorted by date in filename)
set "recent_file="

for /f "delims=" %%f in ('dir /b /o:-n "logs\*_sistema.log" 2^>nul') do (
    if not defined recent_file (
        set "recent_file=logs\%%f"
    )
)

if "%recent_file%"=="" (
    echo Nenhum arquivo de log encontrado.
) else (
    echo [LOG MAIS RECENTE] %recent_file%
    echo ----------------------------------------
    type "%recent_file%"
    echo ----------------------------------------
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto :main_menu

:cleanup_logs
cls
echo.
echo ========================================
echo  LIMPEZA DE LOGS ANTIGOS
echo ========================================
echo.
echo Esta opcao remove logs com mais de 7 dias.
echo.

set /p confirm="Confirma a limpeza? (s/N): "
if /i not "%confirm%"=="s" goto :main_menu

echo.
echo Removendo logs antigos...

REM Calculate date 7 days ago (simplified approach)
for /f %%d in ('powershell -command "(Get-Date).AddDays(-7).ToString('yyyy-MM-dd')"') do set "cutoff_date=%%d"

set /a removed=0
for %%f in ("logs\*_sistema.log") do (
    if exist "%%f" (
        for /f "tokens=1 delims=_" %%d in ("%%~nf") do (
            if "%%d" LSS "%cutoff_date%" (
                del "%%f"
                set /a removed+=1
                echo Removido: %%~nxf
            )
        )
    )
)

echo.
if %removed%==0 (
    echo Nenhum log antigo encontrado para remover.
) else (
    echo %removed% arquivo(s) de log removido(s).
)

echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto :main_menu

:open_folder
start explorer "%CD%\logs"
goto :main_menu

:exit
echo.
echo Saindo do visualizador de logs...
exit /b

REM Enable delayed expansion for variables in loops
setlocal enabledelayedexpansion 