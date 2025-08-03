# NFL Helmet Sheet Splitter

This directory contains scripts to split a single sheet of NFL helmets into individual logo files.

## 🏈 What These Scripts Do

1. **Split the helmet sheet** into 32 individual team helmets
2. **Create both regular and flipped versions** for "facing each other" matchups
3. **Center and consistently size** each helmet (32x32px)
4. **Preserve transparency** throughout the process
5. **Name files according to our convention**

## 📁 Files Created

### Team Helmets (64 total files)
- **Regular versions**: `{team-id}-helmet.png` (32 files)
- **Flipped versions**: `{team-id}-helmet-flipped.png` (32 files)

### Examples
- `buf-helmet.png` - Buffalo Bills (regular)
- `buf-helmet-flipped.png` - Buffalo Bills (flipped)
- `dal-helmet.png` - Dallas Cowboys (regular)
- `dal-helmet-flipped.png` - Dallas Cowboys (flipped)

## 🚀 How to Use

### Prerequisites
- **ImageMagick** installed and available as `magick` command
- **Your helmet sheet** saved as `helmets-sheet.png` in the `scripts/` directory

### Step 1: Prepare Your File
1. Save your helmet sheet as `helmets-sheet.png` in the `scripts/` directory
2. Ensure it has the layout described in the image description

### Step 2: Run the Script

#### On Windows:
```bash
cd scripts
split-helmets.bat
```

#### On Linux/Mac:
```bash
cd scripts
chmod +x split-helmets.sh
./split-helmets.sh
```

### Step 3: Check Results
- Files will be created in `public/icons/`
- You should see 64 helmet files (32 regular + 32 flipped)

## 🎯 Usage in the App

### For Team Badges (Regular Helmets)
```typescript
import { getTeamHelmetPath } from '../utils/helmetIcons';

// In your component
<img src={getTeamHelmetPath('BUF')} alt="Bills" className="w-8 h-8" />
```

### For Matchups (Facing Each Other)
```typescript
// Away team (left side) - use flipped version
<img src="/icons/buf-helmet-flipped.png" alt="Bills" className="w-8 h-8" />

// Home team (right side) - use regular version  
<img src="/icons/dal-helmet.png" alt="Cowboys" className="w-8 h-8" />
```

## 🔧 Customization

### Change Output Size
Edit the `HELMET_SIZE` variable in the script:
```bash
HELMET_SIZE="48x48"  # For larger helmets
HELMET_SIZE="24x24"  # For smaller helmets
```

### Change Input File
Edit the `INPUT_FILE` variable:
```bash
INPUT_FILE="my-helmets.png"  # Your custom filename
```

### Adjust Crop Dimensions
If the automatic cropping doesn't work perfectly, adjust these values:
```bash
HELMET_WIDTH=280      # Width of each helmet
HELMET_HEIGHT=230     # Height of each helmet
H_SPACING=60          # Horizontal spacing between helmets
V_SPACING=30          # Vertical spacing between rows
LEFT_SECTION_WIDTH=1000  # Width of left section
CENTRAL_GAP=350       # Gap between left and right sections
```

## 🐛 Troubleshooting

### Helmets Not Aligned
- Check the crop dimensions in the script
- Verify your input image matches the expected layout
- Adjust `HELMET_WIDTH`, `HELMET_HEIGHT`, and spacing values

### Missing Files
- Ensure ImageMagick is installed and accessible
- Check that the input file exists and is readable
- Verify the output directory is writable

### Wrong Team Order
- The script assumes a specific team order based on the image description
- If your layout is different, you'll need to modify the team mapping in the script

## 📋 Team Order (Expected Layout)

### Row 1
- Left: Buffalo Bills, Miami Dolphins, New York Jets
- Right: Dallas Cowboys, Philadelphia Eagles, New York Giants

### Row 2  
- Left: New England Patriots, Baltimore Ravens, Cincinnati Bengals
- Right: Washington Commanders, Detroit Lions, Green Bay Packers

### Row 3
- Left: Cleveland Browns, Pittsburgh Steelers, Houston Texans
- Right: Minnesota Vikings, Chicago Bears, Tampa Bay Buccaneers

### Row 4
- Left: Indianapolis Colts, Jacksonville Jaguars, Tennessee Titans
- Right: Carolina Panthers, Atlanta Falcons, New Orleans Saints

### Row 5
- Left: Denver Broncos, Kansas City Chiefs, Los Angeles Chargers
- Right: San Francisco 49ers, Seattle Seahawks, Los Angeles Rams

### Row 6
- Left: Las Vegas Raiders
- Right: Arizona Cardinals

## 🎨 Next Steps

After running the script, you'll still need to add:
- **Conference helmets**: `afc.png`, `nfc.png`
- **NFL logo**: `nfl-logo.png`

These can be created manually or with additional ImageMagick commands. 