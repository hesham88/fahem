@echo off
REM ==============================================================================
REM Bible Guard (collapsed model) — the SINGLE source of truth is the independent
REM live re-execution suite (scripts/reexec_dbox.py). Builder-emitted screenshots/
REM verdicts/GF-stubs are NO LONGER a gate (they were gamed). done = the live
REM re-exec for the behavior passes on fahem.pro.
REM   guard.bat pre-claim [task] [builder]
REM   guard.bat pre-done  <task|D-box>      (drift+invariants+nofakes+integrity+REEXEC)
REM   guard.bat deploy                      (lints+build+parity+FULL live sweep)
REM   guard.bat sweep | sweep-full          (live regression+perf truth-sweep)
REM   guard.bat audit                       (advisory only: coverage+functional, never blocks)
REM ==============================================================================

set PHASE=%1
set PYTHON_CMD=python
if exist "C:\Python313\python.exe" set PYTHON_CMD=C:\Python313\python.exe

if "%PHASE%"=="" ( echo Usage: pre-claim^|pre-done ^<task^>^|deploy^|sweep^|audit & exit /b 1 )
if "%PHASE%"=="pre-claim" goto pre_claim
if "%PHASE%"=="pre-done" goto pre_done
if "%PHASE%"=="deploy" goto deploy_phase
if "%PHASE%"=="sweep" goto sweep_phase
if "%PHASE%"=="sweep-full" goto sweep_full
if "%PHASE%"=="audit" goto audit_phase
echo Error: unknown phase '%PHASE%'. & exit /b 1

:pre_claim
echo === PRE-CLAIM ===
%PYTHON_CMD% scripts/guard_drift.py
if errorlevel 1 exit /b 1
if not "%2"=="" if not "%3"=="" ( %PYTHON_CMD% scripts/guard_claim.py claim %2 %3 & if errorlevel 1 exit /b 1 )
echo === PRE-CLAIM OK === & exit /b 0

:pre_done
set TASK_ID=%2
if "%TASK_ID%"=="" ( echo Error: missing task/D-box. & exit /b 1 )
echo === PRE-DONE (live re-exec truth) for %TASK_ID% ===
%PYTHON_CMD% scripts/guard_drift.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_invariants.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_nofakes.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_integrity.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/reexec_dbox.py %TASK_ID%
if errorlevel 2 ( echo [PRE-DONE] Visual/advisory box — owner must eyeball; no live re-exec gate. & goto pre_done_ok )
if errorlevel 1 ( echo [PRE-DONE][FAIL] Live re-exec failed — the feature is NOT working on fahem.pro. & exit /b 1 )
:pre_done_ok
echo === PRE-DONE PASSED (live re-exec) for %TASK_ID% === & exit /b 0

:deploy_phase
echo === DEPLOY (stabilize gate) ===
%PYTHON_CMD% scripts/guard_drift.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_invariants.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_nofakes.py
if errorlevel 1 exit /b 1
%PYTHON_CMD% scripts/guard_integrity.py
if errorlevel 1 exit /b 1
echo Step 2: Next.js build...
cd web
call npm run build
if errorlevel 1 ( cd .. & exit /b 1 )
cd ..
echo Step 3: Deploy parity (HEAD)...
%PYTHON_CMD% scripts/guard_deploy.py
if errorlevel 1 exit /b 1
echo Step 4: FULL live regression+perf sweep (the truth)...
%PYTHON_CMD% scripts/reexec_dbox.py SWEEP-FULL
if errorlevel 1 ( echo [DEPLOY][FAIL] Live sweep RED — a feature is broken or slow; do NOT ship. & exit /b 1 )
echo === DEPLOY VERIFIED (live sweep green) === & exit /b 0

:sweep_phase
%PYTHON_CMD% scripts/reexec_dbox.py SWEEP
exit /b %errorlevel%

:sweep_full
%PYTHON_CMD% scripts/reexec_dbox.py SWEEP-FULL
exit /b %errorlevel%

:audit_phase
echo === AUDIT (advisory only — never blocks) ===
%PYTHON_CMD% scripts/guard_coverage.py
%PYTHON_CMD% scripts/guard_functional.py
echo === AUDIT done (informational) === & exit /b 0
