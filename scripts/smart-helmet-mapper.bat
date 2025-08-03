@echo off
setlocal enabledelayedexpansion

REM Smart Helmet Mapper - Uses common NFL helmet sheet layouts
REM This script maps teams based on typical helmet sheet arrangements

set INPUT_FILE=helmets-sheet.png
set OUTPUT_DIR=..\public\icons
set HELMET_SIZE=32x32

REM Create output directory if it doesn't exist
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Helmet dimensions
set HELMET_WIDTH=120
set HELMET_HEIGHT=80
set H_SPACING=20
set V_SPACING=15

echo 🏈 Smart Helmet Mapper
echo Input: %INPUT_FILE% (860x462)
echo Output: %OUTPUT_DIR%
echo.

REM Common NFL helmet sheet layouts - trying the most likely arrangement
REM Based on typical NFL merchandise layouts (AFC left, NFC right)

echo 🔍 Attempting common NFL helmet sheet layout...
echo.

REM Row 1: AFC East and NFC East
echo Processing Row 1: AFC East and NFC East
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\buf-helmet.png"
magick "%OUTPUT_DIR%\buf-helmet.png" -flop "%OUTPUT_DIR%\buf-helmet-flipped.png"
echo ✅ Created buf-helmet.png (Bills - AFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\mia-helmet.png"
magick "%OUTPUT_DIR%\mia-helmet.png" -flop "%OUTPUT_DIR%\mia-helmet-flipped.png"
echo ✅ Created mia-helmet.png (Dolphins - AFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+280+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ne-helmet.png"
magick "%OUTPUT_DIR%\ne-helmet.png" -flop "%OUTPUT_DIR%\ne-helmet-flipped.png"
echo ✅ Created ne-helmet.png (Patriots - AFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+480+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\dal-helmet.png"
magick "%OUTPUT_DIR%\dal-helmet.png" -flop "%OUTPUT_DIR%\dal-helmet-flipped.png"
echo ✅ Created dal-helmet.png (Cowboys - NFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+600+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\phi-helmet.png"
magick "%OUTPUT_DIR%\phi-helmet.png" -flop "%OUTPUT_DIR%\phi-helmet-flipped.png"
echo ✅ Created phi-helmet.png (Eagles - NFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+720+0 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\nyg-helmet.png"
magick "%OUTPUT_DIR%\nyg-helmet.png" -flop "%OUTPUT_DIR%\nyg-helmet-flipped.png"
echo ✅ Created nyg-helmet.png (Giants - NFC East)

REM Row 2: AFC North and NFC North
echo.
echo Processing Row 2: AFC North and NFC North
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\bal-helmet.png"
magick "%OUTPUT_DIR%\bal-helmet.png" -flop "%OUTPUT_DIR%\bal-helmet-flipped.png"
echo ✅ Created bal-helmet.png (Ravens - AFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\cin-helmet.png"
magick "%OUTPUT_DIR%\cin-helmet.png" -flop "%OUTPUT_DIR%\cin-helmet-flipped.png"
echo ✅ Created cin-helmet.png (Bengals - AFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+280+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\cle-helmet.png"
magick "%OUTPUT_DIR%\cle-helmet.png" -flop "%OUTPUT_DIR%\cle-helmet-flipped.png"
echo ✅ Created cle-helmet.png (Browns - AFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+480+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\gb-helmet.png"
magick "%OUTPUT_DIR%\gb-helmet.png" -flop "%OUTPUT_DIR%\gb-helmet-flipped.png"
echo ✅ Created gb-helmet.png (Packers - NFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+600+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\det-helmet.png"
magick "%OUTPUT_DIR%\det-helmet.png" -flop "%OUTPUT_DIR%\det-helmet-flipped.png"
echo ✅ Created det-helmet.png (Lions - NFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+720+95 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\chi-helmet.png"
magick "%OUTPUT_DIR%\chi-helmet.png" -flop "%OUTPUT_DIR%\chi-helmet-flipped.png"
echo ✅ Created chi-helmet.png (Bears - NFC North)

REM Row 3: AFC South and NFC South
echo.
echo Processing Row 3: AFC South and NFC South
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\hou-helmet.png"
magick "%OUTPUT_DIR%\hou-helmet.png" -flop "%OUTPUT_DIR%\hou-helmet-flipped.png"
echo ✅ Created hou-helmet.png (Texans - AFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ind-helmet.png"
magick "%OUTPUT_DIR%\ind-helmet.png" -flop "%OUTPUT_DIR%\ind-helmet-flipped.png"
echo ✅ Created ind-helmet.png (Colts - AFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+280+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\jax-helmet.png"
magick "%OUTPUT_DIR%\jax-helmet.png" -flop "%OUTPUT_DIR%\jax-helmet-flipped.png"
echo ✅ Created jax-helmet.png (Jaguars - AFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+480+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\tb-helmet.png"
magick "%OUTPUT_DIR%\tb-helmet.png" -flop "%OUTPUT_DIR%\tb-helmet-flipped.png"
echo ✅ Created tb-helmet.png (Buccaneers - NFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+600+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\atl-helmet.png"
magick "%OUTPUT_DIR%\atl-helmet.png" -flop "%OUTPUT_DIR%\atl-helmet-flipped.png"
echo ✅ Created atl-helmet.png (Falcons - NFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+720+190 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\car-helmet.png"
magick "%OUTPUT_DIR%\car-helmet.png" -flop "%OUTPUT_DIR%\car-helmet-flipped.png"
echo ✅ Created car-helmet.png (Panthers - NFC South)

REM Row 4: AFC West and NFC West
echo.
echo Processing Row 4: AFC West and NFC West
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\den-helmet.png"
magick "%OUTPUT_DIR%\den-helmet.png" -flop "%OUTPUT_DIR%\den-helmet-flipped.png"
echo ✅ Created den-helmet.png (Broncos - AFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\kc-helmet.png"
magick "%OUTPUT_DIR%\kc-helmet.png" -flop "%OUTPUT_DIR%\kc-helmet-flipped.png"
echo ✅ Created kc-helmet.png (Chiefs - AFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+280+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lac-helmet.png"
magick "%OUTPUT_DIR%\lac-helmet.png" -flop "%OUTPUT_DIR%\lac-helmet-flipped.png"
echo ✅ Created lac-helmet.png (Chargers - AFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+480+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lar-helmet.png"
magick "%OUTPUT_DIR%\lar-helmet.png" -flop "%OUTPUT_DIR%\lar-helmet-flipped.png"
echo ✅ Created lar-helmet.png (Rams - NFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+600+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\sf-helmet.png"
magick "%OUTPUT_DIR%\sf-helmet.png" -flop "%OUTPUT_DIR%\sf-helmet-flipped.png"
echo ✅ Created sf-helmet.png (49ers - NFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+720+285 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\sea-helmet.png"
magick "%OUTPUT_DIR%\sea-helmet.png" -flop "%OUTPUT_DIR%\sea-helmet-flipped.png"
echo ✅ Created sea-helmet.png (Seahawks - NFC West)

REM Row 5: Remaining teams
echo.
echo Processing Row 5: Remaining teams
magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\lv-helmet.png"
magick "%OUTPUT_DIR%\lv-helmet.png" -flop "%OUTPUT_DIR%\lv-helmet-flipped.png"
echo ✅ Created lv-helmet.png (Raiders - AFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\pit-helmet.png"
magick "%OUTPUT_DIR%\pit-helmet.png" -flop "%OUTPUT_DIR%\pit-helmet-flipped.png"
echo ✅ Created pit-helmet.png (Steelers - AFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+280+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ten-helmet.png"
magick "%OUTPUT_DIR%\ten-helmet.png" -flop "%OUTPUT_DIR%\ten-helmet-flipped.png"
echo ✅ Created ten-helmet.png (Titans - AFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+480+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\ari-helmet.png"
magick "%OUTPUT_DIR%\ari-helmet.png" -flop "%OUTPUT_DIR%\ari-helmet-flipped.png"
echo ✅ Created ari-helmet.png (Cardinals - NFC West)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+600+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\no-helmet.png"
magick "%OUTPUT_DIR%\no-helmet.png" -flop "%OUTPUT_DIR%\no-helmet-flipped.png"
echo ✅ Created no-helmet.png (Saints - NFC South)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+720+380 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\nyj-helmet.png"
magick "%OUTPUT_DIR%\nyj-helmet.png" -flop "%OUTPUT_DIR%\nyj-helmet-flipped.png"
echo ✅ Created nyj-helmet.png (Jets - AFC East)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+0+465 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\min-helmet.png"
magick "%OUTPUT_DIR%\min-helmet.png" -flop "%OUTPUT_DIR%\min-helmet-flipped.png"
echo ✅ Created min-helmet.png (Vikings - NFC North)

magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+140+465 -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\was-helmet.png"
magick "%OUTPUT_DIR%\was-helmet.png" -flop "%OUTPUT_DIR%\was-helmet-flipped.png"
echo ✅ Created was-helmet.png (Commanders - NFC East)

echo.
echo 🎉 Smart helmet mapping complete!
echo 📁 All helmet files created in: %OUTPUT_DIR%
echo.
echo 📋 Summary:
echo    - 32 team helmets (regular): {team-id}-helmet.png
echo    - 32 team helmets (flipped): {team-id}-helmet-flipped.png
echo    - Total: 64 helmet files
echo.
echo 🎯 Layout used:
echo    Row 1: AFC East and NFC East
echo    Row 2: AFC North and NFC North  
echo    Row 3: AFC South and NFC South
echo    Row 4: AFC West and NFC West
echo    Row 5: Remaining teams
echo.
echo ⚠️  Note: If teams appear in wrong positions, use interactive-helmet-mapper.bat instead

pause 