#!/bin/bash

# NFL Helmet Sheet Splitter
# This script splits a single sheet of NFL helmets into individual logos
# with both regular and flipped versions for "facing each other" matchups

# Configuration
INPUT_FILE="helmets-sheet.png"  # Your input file
OUTPUT_DIR="../public/icons"
HELMET_SIZE="32x32"  # Final size for each helmet
PADDING="2"  # Padding around each helmet

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Team mapping based on the description (row by row, left to right)
# Row 1: Buffalo Bills, Miami Dolphins, New York Jets | Dallas Cowboys, Philadelphia Eagles, New York Giants
# Row 2: New England Patriots, Baltimore Ravens, Cincinnati Bengals | Washington Commanders, Detroit Lions, Green Bay Packers
# Row 3: Cleveland Browns, Pittsburgh Steelers, Houston Texans | Minnesota Vikings, Chicago Bears, Tampa Bay Buccaneers
# Row 4: Indianapolis Colts, Jacksonville Jaguars, Tennessee Titans | Carolina Panthers, Atlanta Falcons, New Orleans Saints
# Row 5: Denver Broncos, Kansas City Chiefs, Los Angeles Chargers | San Francisco 49ers, Seattle Seahawks, Los Angeles Rams
# Row 6: Las Vegas Raiders | Arizona Cardinals

# Team IDs in order (left section then right section, row by row)
TEAMS=(
    # Row 1
    "buf" "mia" "nyj" "dal" "phi" "nyg"
    # Row 2  
    "ne" "bal" "cin" "was" "det" "gb"
    # Row 3
    "cle" "pit" "hou" "min" "chi" "tb"
    # Row 4
    "ind" "jax" "ten" "car" "atl" "no"
    # Row 5
    "den" "kc" "lac" "sf" "sea" "lar"
    # Row 6
    "lv" "ari"
)

# Estimated crop dimensions based on description
# Each helmet: ~250-280px wide x 200-230px tall
# Horizontal spacing: ~50-70px between helmets
# Vertical spacing: ~20-40px between rows
# Large central gap: ~300-400px

HELMET_WIDTH=280
HELMET_HEIGHT=230
H_SPACING=60
V_SPACING=30
LEFT_SECTION_WIDTH=1000  # Approximate width of left section
CENTRAL_GAP=350  # Gap between left and right sections

echo "🏈 Starting NFL Helmet Sheet Splitter..."
echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_DIR"
echo "Helmet size: $HELMET_SIZE"

# Function to extract and process a single helmet
extract_helmet() {
    local team_id=$1
    local row=$2
    local col=$3
    local section=$4  # "left" or "right"
    
    # Calculate crop position
    local x_offset
    local y_offset
    
    if [ "$section" = "left" ]; then
        x_offset=$((col * (HELMET_WIDTH + H_SPACING)))
    else
        x_offset=$((LEFT_SECTION_WIDTH + CENTRAL_GAP + col * (HELMET_WIDTH + H_SPACING)))
    fi
    
    y_offset=$((row * (HELMET_HEIGHT + V_SPACING)))
    
    # Extract helmet
    local temp_file="${OUTPUT_DIR}/temp_${team_id}.png"
    
    magick "$INPUT_FILE" -crop "${HELMET_WIDTH}x${HELMET_HEIGHT}+${x_offset}+${y_offset}" \
           -trim +repage \
           -background transparent \
           -gravity center \
           -extent "${HELMET_SIZE}" \
           "$temp_file"
    
    # Create regular version
    magick "$temp_file" \
           -background transparent \
           -gravity center \
           -extent "${HELMET_SIZE}" \
           "${OUTPUT_DIR}/${team_id}-helmet.png"
    
    # Create flipped version (for "facing each other")
    magick "$temp_file" \
           -flop \
           -background transparent \
           -gravity center \
           -extent "${HELMET_SIZE}" \
           "${OUTPUT_DIR}/${team_id}-helmet-flipped.png"
    
    # Clean up temp file
    rm "$temp_file"
    
    echo "✅ Created ${team_id}-helmet.png and ${team_id}-helmet-flipped.png"
}

# Extract all helmets
echo ""
echo "🔧 Extracting helmets..."

# Row 1: buf, mia, nyj | dal, phi, nyg
extract_helmet "buf" 0 0 "left"
extract_helmet "mia" 0 1 "left"
extract_helmet "nyj" 0 2 "left"
extract_helmet "dal" 0 0 "right"
extract_helmet "phi" 0 1 "right"
extract_helmet "nyg" 0 2 "right"

# Row 2: ne, bal, cin | was, det, gb
extract_helmet "ne" 1 0 "left"
extract_helmet "bal" 1 1 "left"
extract_helmet "cin" 1 2 "left"
extract_helmet "was" 1 0 "right"
extract_helmet "det" 1 1 "right"
extract_helmet "gb" 1 2 "right"

# Row 3: cle, pit, hou | min, chi, tb
extract_helmet "cle" 2 0 "left"
extract_helmet "pit" 2 1 "left"
extract_helmet "hou" 2 2 "left"
extract_helmet "min" 2 0 "right"
extract_helmet "chi" 2 1 "right"
extract_helmet "tb" 2 2 "right"

# Row 4: ind, jax, ten | car, atl, no
extract_helmet "ind" 3 0 "left"
extract_helmet "jax" 3 1 "left"
extract_helmet "ten" 3 2 "left"
extract_helmet "car" 3 0 "right"
extract_helmet "atl" 3 1 "right"
extract_helmet "no" 3 2 "right"

# Row 5: den, kc, lac | sf, sea, lar
extract_helmet "den" 4 0 "left"
extract_helmet "kc" 4 1 "left"
extract_helmet "lac" 4 2 "left"
extract_helmet "sf" 4 0 "right"
extract_helmet "sea" 4 1 "right"
extract_helmet "lar" 4 2 "right"

# Row 6: lv | ari
extract_helmet "lv" 5 0 "left"
extract_helmet "ari" 5 0 "right"

echo ""
echo "🎯 Creating conference helmets..."

# Create AFC and NFC conference helmets (you'll need to provide these separately)
# For now, creating placeholder files
echo "⚠️  Note: AFC and NFC conference helmets need to be created separately"
echo "   Expected files: afc.png, nfc.png"

echo ""
echo "🏈 Creating NFL logo..."

# Create NFL logo (you'll need to provide this separately)
echo "⚠️  Note: NFL logo needs to be created separately"
echo "   Expected file: nfl-logo.png"

echo ""
echo "✅ Helmet extraction complete!"
echo "📁 Files created in: $OUTPUT_DIR"
echo ""
echo "📋 Summary:"
echo "   - 32 team helmets (regular): {team-id}-helmet.png"
echo "   - 32 team helmets (flipped): {team-id}-helmet-flipped.png"
echo "   - Total: 64 helmet files"
echo ""
echo "🎯 Usage:"
echo "   - Regular helmets: /icons/buf-helmet.png"
echo "   - Flipped helmets: /icons/buf-helmet-flipped.png"
echo "   - For matchups: Use regular for home, flipped for away" 