@echo off
setlocal enabledelayedexpansion

REM Interactive Helmet Mapper
REM This script crops each position and asks you to identify the team

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

echo 🏈 Interactive Helmet Mapper
echo Input: %INPUT_FILE% (860x462)
echo Output: %OUTPUT_DIR%
echo.
echo This script will crop each helmet position and ask you to identify the team.
echo.

REM Define positions (x, y, position_name)
set positions[0]=0,0,pos1
set positions[1]=140,0,pos2
set positions[2]=280,0,pos3
set positions[3]=480,0,pos4
set positions[4]=600,0,pos5
set positions[5]=720,0,pos6
set positions[6]=0,95,pos7
set positions[7]=140,95,pos8
set positions[8]=280,95,pos9
set positions[9]=480,95,pos10
set positions[10]=600,95,pos11
set positions[11]=720,95,pos12
set positions[12]=0,190,pos13
set positions[13]=140,190,pos14
set positions[14]=280,190,pos15
set positions[15]=480,190,pos16
set positions[16]=600,190,pos17
set positions[17]=720,190,pos18
set positions[18]=0,285,pos19
set positions[19]=140,285,pos20
set positions[20]=280,285,pos21
set positions[21]=480,285,pos22
set positions[22]=600,285,pos23
set positions[23]=720,285,pos24
set positions[24]=0,380,pos25
set positions[25]=480,380,pos26

echo Starting interactive mapping...
echo.

for /L %%i in (0,1,25) do (
    set "pos_data=!positions[%%i]!"
    for /f "tokens=1,2,3 delims=," %%a in ("!pos_data!") do (
        set x=%%a
        set y=%%b
        set pos_name=%%c
        
        echo Processing position !pos_name! (x=!x!, y=!y!)
        
        REM Crop the helmet
        magick "%INPUT_FILE%" -crop %HELMET_WIDTH%x%HELMET_HEIGHT%+!x!+!y! -trim +repage -background transparent -gravity center -extent %HELMET_SIZE% "%OUTPUT_DIR%\!pos_name!-temp.png"
        
        echo Created: %OUTPUT_DIR%\!pos_name!-temp.png
        echo.
        set /p team_id="Enter team ID for position !pos_name! (e.g., buf, ne, bal, etc.): "
        
        REM Create the final files
        copy "%OUTPUT_DIR%\!pos_name!-temp.png" "%OUTPUT_DIR%\!team_id!-helmet.png"
        magick "%OUTPUT_DIR%\!team_id!-helmet.png" -flop "%OUTPUT_DIR%\!team_id!-helmet-flipped.png"
        
        echo ✅ Created !team_id!-helmet.png and !team_id!-helmet-flipped.png
        echo.
    )
)

echo.
echo 🎉 Interactive mapping complete!
echo 📁 All helmet files created in: %OUTPUT_DIR%
echo.
echo 📋 Summary:
echo    - 26 team helmets (regular): {team-id}-helmet.png
echo    - 26 team helmets (flipped): {team-id}-helmet-flipped.png
echo    - Total: 52 helmet files
echo.
echo 🎯 Usage:
echo    - Regular helmets: /icons/buf-helmet.png
echo    - Flipped helmets: /icons/buf-helmet-flipped.png
echo    - For matchups: Use regular for home, flipped for away

pause 