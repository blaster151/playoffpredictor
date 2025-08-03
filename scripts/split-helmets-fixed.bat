@echo off
setlocal enabledelayedexpansion

REM NFL Helmet Sheet Splitter (Windows Batch Version) - FIXED DIMENSIONS
REM This script splits a single sheet of NFL helmets into individual logos
REM with both regular and flipped versions for "facing each other" matchups

REM Configuration
set INPUT_FILE=helmets-sheet.png
set OUTPUT_DIR=..\public\icons
set HELMET_SIZE=32x32

REM Create output directory if it doesn't exist
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM ACTUAL IMAGE DIMENSIONS: 860x462
REM Adjusted crop dimensions based on actual image size
set HELMET_WIDTH=120
set HELMET_HEIGHT=80
set H_SPACING=20
set V_SPACING=15
set LEFT_SECTION_WIDTH=430
set CENTRAL_GAP=50

echo 🏈 Starting NFL Helmet Sheet Splitter (FIXED DIMENSIONS)...
echo Input: %INPUT_FILE% (860x462)
echo Output: %OUTPUT_DIR%
echo Helmet size: %HELMET_SIZE%

echo.
echo 🔧 Extracting helmets...

REM Row 1: buf, mia, nyj | dal, phi, nyg
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\buf-helmet.png"
magick "%OUTPUT_DIR%\buf-helmet.png" -flop "%OUTPUT_DIR%\buf-helmet-flipped.png"
echo ✅ Created buf-helmet.png and buf-helmet-flipped.png

set /a x_offset=1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\mia-helmet.png"
magick "%OUTPUT_DIR%\mia-helmet.png" -flop "%OUTPUT_DIR%\mia-helmet-flipped.png"
echo ✅ Created mia-helmet.png and mia-helmet-flipped.png

set /a x_offset=2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\nyj-helmet.png"
magick "%OUTPUT_DIR%\nyj-helmet.png" -flop "%OUTPUT_DIR%\nyj-helmet-flipped.png"
echo ✅ Created nyj-helmet.png and nyj-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\dal-helmet.png"
magick "%OUTPUT_DIR%\dal-helmet.png" -flop "%OUTPUT_DIR%\dal-helmet-flipped.png"
echo ✅ Created dal-helmet.png and dal-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\phi-helmet.png"
magick "%OUTPUT_DIR%\phi-helmet.png" -flop "%OUTPUT_DIR%\phi-helmet-flipped.png"
echo ✅ Created phi-helmet.png and phi-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=0 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\nyg-helmet.png"
magick "%OUTPUT_DIR%\nyg-helmet.png" -flop "%OUTPUT_DIR%\nyg-helmet-flipped.png"
echo ✅ Created nyg-helmet.png and nyg-helmet-flipped.png

REM Row 2: ne, bal, cin | was, det, gb
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ne-helmet.png"
magick "%OUTPUT_DIR%\ne-helmet.png" -flop "%OUTPUT_DIR%\ne-helmet-flipped.png"
echo ✅ Created ne-helmet.png and ne-helmet-flipped.png

set /a x_offset=1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\bal-helmet.png"
magick "%OUTPUT_DIR%\bal-helmet.png" -flop "%OUTPUT_DIR%\bal-helmet-flipped.png"
echo ✅ Created bal-helmet.png and bal-helmet-flipped.png

set /a x_offset=2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\cin-helmet.png"
magick "%OUTPUT_DIR%\cin-helmet.png" -flop "%OUTPUT_DIR%\cin-helmet-flipped.png"
echo ✅ Created cin-helmet.png and cin-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\was-helmet.png"
magick "%OUTPUT_DIR%\was-helmet.png" -flop "%OUTPUT_DIR%\was-helmet-flipped.png"
echo ✅ Created was-helmet.png and was-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\det-helmet.png"
magick "%OUTPUT_DIR%\det-helmet.png" -flop "%OUTPUT_DIR%\det-helmet-flipped.png"
echo ✅ Created det-helmet.png and det-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=1 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\gb-helmet.png"
magick "%OUTPUT_DIR%\gb-helmet.png" -flop "%OUTPUT_DIR%\gb-helmet-flipped.png"
echo ✅ Created gb-helmet.png and gb-helmet-flipped.png

REM Row 3: cle, pit, hou | min, chi, tb
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\cle-helmet.png"
magick "%OUTPUT_DIR%\cle-helmet.png" -flop "%OUTPUT_DIR%\cle-helmet-flipped.png"
echo ✅ Created cle-helmet.png and cle-helmet-flipped.png

set /a x_offset=1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\pit-helmet.png"
magick "%OUTPUT_DIR%\pit-helmet.png" -flop "%OUTPUT_DIR%\pit-helmet-flipped.png"
echo ✅ Created pit-helmet.png and pit-helmet-flipped.png

set /a x_offset=2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\hou-helmet.png"
magick "%OUTPUT_DIR%\hou-helmet.png" -flop "%OUTPUT_DIR%\hou-helmet-flipped.png"
echo ✅ Created hou-helmet.png and hou-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\min-helmet.png"
magick "%OUTPUT_DIR%\min-helmet.png" -flop "%OUTPUT_DIR%\min-helmet-flipped.png"
echo ✅ Created min-helmet.png and min-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\chi-helmet.png"
magick "%OUTPUT_DIR%\chi-helmet.png" -flop "%OUTPUT_DIR%\chi-helmet-flipped.png"
echo ✅ Created chi-helmet.png and chi-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=2 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\tb-helmet.png"
magick "%OUTPUT_DIR%\tb-helmet.png" -flop "%OUTPUT_DIR%\tb-helmet-flipped.png"
echo ✅ Created tb-helmet.png and tb-helmet-flipped.png

REM Row 4: ind, jax, ten | car, atl, no
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ind-helmet.png"
magick "%OUTPUT_DIR%\ind-helmet.png" -flop "%OUTPUT_DIR%\ind-helmet-flipped.png"
echo ✅ Created ind-helmet.png and ind-helmet-flipped.png

set /a x_offset=1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\jax-helmet.png"
magick "%OUTPUT_DIR%\jax-helmet.png" -flop "%OUTPUT_DIR%\jax-helmet-flipped.png"
echo ✅ Created jax-helmet.png and jax-helmet-flipped.png

set /a x_offset=2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ten-helmet.png"
magick "%OUTPUT_DIR%\ten-helmet.png" -flop "%OUTPUT_DIR%\ten-helmet-flipped.png"
echo ✅ Created ten-helmet.png and ten-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\car-helmet.png"
magick "%OUTPUT_DIR%\car-helmet.png" -flop "%OUTPUT_DIR%\car-helmet-flipped.png"
echo ✅ Created car-helmet.png and car-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\atl-helmet.png"
magick "%OUTPUT_DIR%\atl-helmet.png" -flop "%OUTPUT_DIR%\atl-helmet-flipped.png"
echo ✅ Created atl-helmet.png and atl-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=3 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\no-helmet.png"
magick "%OUTPUT_DIR%\no-helmet.png" -flop "%OUTPUT_DIR%\no-helmet-flipped.png"
echo ✅ Created no-helmet.png and no-helmet-flipped.png

REM Row 5: den, kc, lac | sf, sea, lar
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\den-helmet.png"
magick "%OUTPUT_DIR%\den-helmet.png" -flop "%OUTPUT_DIR%\den-helmet-flipped.png"
echo ✅ Created den-helmet.png and den-helmet-flipped.png

set /a x_offset=1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\kc-helmet.png"
magick "%OUTPUT_DIR%\kc-helmet.png" -flop "%OUTPUT_DIR%\kc-helmet-flipped.png"
echo ✅ Created kc-helmet.png and kc-helmet-flipped.png

set /a x_offset=2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lac-helmet.png"
magick "%OUTPUT_DIR%\lac-helmet.png" -flop "%OUTPUT_DIR%\lac-helmet-flipped.png"
echo ✅ Created lac-helmet.png and lac-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\sf-helmet.png"
magick "%OUTPUT_DIR%\sf-helmet.png" -flop "%OUTPUT_DIR%\sf-helmet-flipped.png"
echo ✅ Created sf-helmet.png and sf-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 1 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\sea-helmet.png"
magick "%OUTPUT_DIR%\sea-helmet.png" -flop "%OUTPUT_DIR%\sea-helmet-flipped.png"
echo ✅ Created sea-helmet.png and sea-helmet-flipped.png

set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 2 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=4 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lar-helmet.png"
magick "%OUTPUT_DIR%\lar-helmet.png" -flop "%OUTPUT_DIR%\lar-helmet-flipped.png"
echo ✅ Created lar-helmet.png and lar-helmet-flipped.png

REM Row 6: lv | ari
REM Left section
set /a x_offset=0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=5 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lv-helmet.png"
magick "%OUTPUT_DIR%\lv-helmet.png" -flop "%OUTPUT_DIR%\lv-helmet-flipped.png"
echo ✅ Created lv-helmet.png and lv-helmet-flipped.png

REM Right section
set /a x_offset=%LEFT_SECTION_WIDTH% + %CENTRAL_GAP% + 0 * (%HELMET_WIDTH% + %H_SPACING%)
set /a y_offset=5 * (%HELMET_HEIGHT% + %V_SPACING%)
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+%x_offset%+%y_offset% -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ari-helmet.png"
magick "%OUTPUT_DIR%\ari-helmet.png" -flop "%OUTPUT_DIR%\ari-helmet-flipped.png"
echo ✅ Created ari-helmet.png and ari-helmet-flipped.png

echo.
echo 🎯 Creating conference helmets...
echo ⚠️  Note: AFC and NFC conference helmets need to be created separately
echo    Expected files: afc.png, nfc.png

echo.
echo 🏈 Creating NFL logo...
echo ⚠️  Note: NFL logo needs to be created separately
echo    Expected file: nfl-logo.png

echo.
echo ✅ Helmet extraction complete!
echo 📁 Files created in: %OUTPUT_DIR%
echo.
echo 📋 Summary:
echo    - 32 team helmets (regular): {team-id}-helmet.png
echo    - 32 team helmets (flipped): {team-id}-helmet-flipped.png
echo    - Total: 64 helmet files
echo.
echo 🎯 Usage:
echo    - Regular helmets: /icons/buf-helmet.png
echo    - Flipped helmets: /icons/buf-helmet-flipped.png
echo    - For matchups: Use regular for home, flipped for away

pause 