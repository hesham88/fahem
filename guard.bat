@echo off
rem ==============================================================================
REM Bible Guard Master CLI Entry Point for Windows
REM Usage: guard.bat <phase> [arguments]
REM   guard.bat pre-claim [task_id] [builder_name]
REM   guard.bat pre-done <task_id>
REM   guard.bat deploy
rem ==============================================================================

set PHASE=%1

if "%PHASE%"=="" (
  echo Error: Missing phase argument.
  echo Usage:
  echo   guard.bat pre-claim [task_id] [builder_name]
  echo   guard.bat pre-done ^<task_id^>
  echo   guard.bat deploy
  exit /b 1
)

REM Locate Python executable
set PYTHON_CMD=python
if exist "C:\Python313\python.exe" (
  set PYTHON_CMD=C:\Python313\python.exe
)

if "%PHASE%"=="pre-claim" goto pre_claim
if "%PHASE%"=="pre-done" goto pre_done
if "%PHASE%"=="deploy" goto deploy_phase

echo Error: Unknown phase '%PHASE%'.
echo Available phases: pre-claim, pre-done, deploy
exit /b 1

:pre_claim
echo === Running PRE-CLAIM Checks ===
%PYTHON_CMD% scripts/guard_drift.py
if errorlevel 1 exit /b 1

set TASK_ID=%2
set BUILDER_NAME=%3
if "%TASK_ID%"=="" goto pre_claim_done
if "%BUILDER_NAME%"=="" (
  %PYTHON_CMD% scripts/guard_claim.py check %TASK_ID%
  if errorlevel 1 exit /b 1
) else (
  %PYTHON_CMD% scripts/guard_claim.py claim %TASK_ID% %BUILDER_NAME%
  if errorlevel 1 exit /b 1
)

:pre_claim_done
echo === PRE-CLAIM Checks Passed ===
exit /b 0

:pre_done
set TASK_ID=%2
if "%TASK_ID%"=="" (
  echo Error: Missing task_id for pre-done check.
  echo Usage: guard.bat pre-done ^<task_id^>
  exit /b 1
)

echo === Running PRE-DONE Checks for task %TASK_ID% ===
%PYTHON_CMD% scripts/guard_invariants.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_nofakes.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_regressions.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_smoke.py %TASK_ID% D1 %3 %4 %5 %6
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_done.py %TASK_ID% %3 %4 %5 %6
if errorlevel 1 exit /b 1
echo === ALL PRE-DONE Checks Passed for task %TASK_ID% ===
exit /b 0

:deploy_phase
echo === Running DEPLOY Checklist ===

echo Step 1: Running local code-level guards before build...
%PYTHON_CMD% scripts/guard_invariants.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_nofakes.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_regressions.py
if errorlevel 1 exit /b 1

echo Step 2: Performing Next.js build verification...
cd web
call npm run build
if errorlevel 1 (
  cd ..
  exit /b 1
)
cd ..

echo Step 3: Running Deploy Parity check (G8)...
%PYTHON_CMD% scripts/guard_deploy.py
if errorlevel 1 exit /b 1

echo Step 4: Running authenticated E2E Smoke Tests (G6)...
%PYTHON_CMD% scripts/guard_smoke.py Task-0 D1
if errorlevel 1 exit /b 1

echo === DEPLOY Verification Successful! ^(D0 + D1 are GREEN^) ===
exit /b 0
