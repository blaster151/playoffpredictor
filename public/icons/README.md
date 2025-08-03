# NFL Helmet Icons

## Naming Convention

### Team Helmets
- **Format**: `{team-id}-helmet.png` or `{team-id}-helmet.svg`
- **Size**: 32x32px (recommended for team badges)
- **Examples**:
  - `buf-helmet.png` (Buffalo Bills)
  - `dal-helmet.png` (Dallas Cowboys)
  - `ne-helmet.png` (New England Patriots)
  - `sf-helmet.png` (San Francisco 49ers)

### Conference Helmets
- **Format**: `{conference}.png` or `{conference}.svg`
- **Size**: 24x24px (recommended for conference indicators)
- **Examples**:
  - `afc.png` (AFC Conference)
  - `nfc.png` (NFC Conference)

### NFL Logo
- **Format**: `nfl-logo.png` or `nfl-logo.svg`
- **Size**: 48x48px (recommended for header)
- **Usage**: Main NFL logo for header/branding

## Team IDs Reference

### AFC Teams
- `buf` - Buffalo Bills
- `mia` - Miami Dolphins
- `ne` - New England Patriots
- `nyj` - New York Jets
- `bal` - Baltimore Ravens
- `cin` - Cincinnati Bengals
- `cle` - Cleveland Browns
- `pit` - Pittsburgh Steelers
- `hou` - Houston Texans
- `ind` - Indianapolis Colts
- `jax` - Jacksonville Jaguars
- `ten` - Tennessee Titans
- `den` - Denver Broncos
- `kc` - Kansas City Chiefs
- `lv` - Las Vegas Raiders
- `lac` - Los Angeles Chargers

### NFC Teams
- `dal` - Dallas Cowboys
- `nyg` - New York Giants
- `phi` - Philadelphia Eagles
- `was` - Washington Commanders
- `chi` - Chicago Bears
- `det` - Detroit Lions
- `gb` - Green Bay Packers
- `min` - Minnesota Vikings
- `atl` - Atlanta Falcons
- `car` - Carolina Panthers
- `no` - New Orleans Saints
- `tb` - Tampa Bay Buccaneers
- `ari` - Arizona Cardinals
- `lar` - Los Angeles Rams
- `sf` - San Francisco 49ers
- `sea` - Seattle Seahawks

## Usage Guidelines

### In Code
```typescript
// Team helmet in standings
<img src="/icons/buf-helmet.png" alt="Bills" className="w-8 h-8" />

// Conference helmet in headers
<img src="/icons/afc.png" alt="AFC" className="w-6 h-6" />

// NFL logo in header
<img src="/icons/nfl-logo.png" alt="NFL" className="w-12 h-12" />
```

### Recommended Sizes
- **Team badges**: 32x32px
- **Conference indicators**: 24x24px
- **Header NFL logo**: 48x48px
- **Large display**: 64x64px

## File Format Recommendations
- **PNG**: For logos with transparency
- **SVG**: For scalable vector graphics (preferred)
- **WebP**: For optimized web delivery

## Notes
- Keep file sizes under 50KB each
- Use consistent aspect ratios
- Ensure good contrast for visibility
- Test on both light and dark backgrounds 