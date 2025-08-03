@echo off
setlocal enabledelayedexpansion

REM Helmet Sheet Analyzer - Creates a numbered grid overlay
REM This helps us see the actual team layout in the image

set INPUT_FILE=helmets-sheet.png
set OUTPUT_DIR=..\public\icons

REM Create output directory if it doesn't exist
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo 🏈 Analyzing helmet sheet layout...
echo Input: %INPUT_FILE% (860x462)

REM Create a grid overlay with numbered positions
echo Creating grid overlay...

REM Create a base grid image with numbered positions
magick -size 860x462 xc:transparent -fill red -stroke black -strokewidth 2 ^
  -draw "rectangle 0,0 430,95" ^
  -draw "rectangle 480,0 860,95" ^
  -draw "rectangle 0,110 430,205" ^
  -draw "rectangle 480,110 860,205" ^
  -draw "rectangle 0,220 430,315" ^
  -draw "rectangle 480,220 860,315" ^
  -draw "rectangle 0,330 430,425" ^
  -draw "rectangle 480,330 860,425" ^
  -draw "rectangle 0,440 430,462" ^
  -draw "rectangle 480,440 860,462" ^
  -fill white -pointsize 20 -gravity center ^
  -draw "text 35,47 '1'" ^
  -draw "text 155,47 '2'" ^
  -draw "text 275,47 '3'" ^
  -draw "text 515,47 '4'" ^
  -draw "text 635,47 '5'" ^
  -draw "text 755,47 '6'" ^
  -draw "text 35,157 '7'" ^
  -draw "text 155,157 '8'" ^
  -draw "text 275,157 '9'" ^
  -draw "text 515,157 '10'" ^
  -draw "text 635,157 '11'" ^
  -draw "text 755,157 '12'" ^
  -draw "text 35,267 '13'" ^
  -draw "text 155,267 '14'" ^
  -draw "text 275,267 '15'" ^
  -draw "text 515,267 '16'" ^
  -draw "text 635,267 '17'" ^
  -draw "text 755,267 '18'" ^
  -draw "text 35,377 '19'" ^
  -draw "text 155,377 '20'" ^
  -draw "text 275,377 '21'" ^
  -draw "text 515,377 '22'" ^
  -draw "text 635,377 '23'" ^
  -draw "text 755,377 '24'" ^
  -draw "text 35,451 '25'" ^
  -draw "text 515,451 '26'" ^
  "%OUTPUT_DIR%\grid-overlay.png"

REM Composite the grid over the original image
magick composite -gravity center "%OUTPUT_DIR%\grid-overlay.png" "%INPUT_FILE%" "%OUTPUT_DIR%\helmets-with-grid.png"

echo.
echo ✅ Created grid overlay analysis:
echo    - Grid overlay: %OUTPUT_DIR%\grid-overlay.png
echo    - Image with grid: %OUTPUT_DIR%\helmets-with-grid.png
echo.
echo 📋 Grid Layout (32 positions):
echo    Row 1: 1  2  3  |  4  5  6
echo    Row 2: 7  8  9  |  10 11 12
echo    Row 3: 13 14 15 |  16 17 18
echo    Row 4: 19 20 21 |  22 23 24
echo    Row 5: 25       |  26
echo.
echo 🎯 Next steps:
echo    1. Open helmets-with-grid.png to see the numbered positions
echo    2. Identify which team is in each numbered position
echo    3. Create a mapping file with the correct team order

pause 