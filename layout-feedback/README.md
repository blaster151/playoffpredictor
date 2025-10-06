# Visual UI Feedback System

This directory contains automated tools for getting visual feedback on UI layout changes.

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Take layout screenshots:**
   ```bash
   npm run screenshots
   ```

3. **View the results:**
   - Open the PNG files in `layout-feedback/` directory
   - Compare before/after making layout changes

## Available Scripts

### `npm run screenshots`
- Uses Puppeteer to take automated screenshots
- Lighter weight than Playwright
- Shows browser window while capturing (set `headless: true` to hide)
- Saves to `layout-feedback/` directory

### `npm run visual-feedback` 
- Uses Playwright for more advanced testing
- Requires browsers to be installed: `npx playwright install`
- Headed mode for real-time feedback

### `npm run test:layout`
- Full Playwright test suite for layout validation
- Includes regression testing capabilities

## Screenshots Captured

- **full-page.png** - Complete page layout
- **header.png** - Navigation bar area
- **main-content.png** - Main container area  
- **game-area.png** - Game predictions section

## Layout Metrics

The scripts also output useful metrics:
- Viewport dimensions
- Container width utilization
- Number of game columns found
- Column widths

## Workflow for Layout Changes

1. Make CSS/layout changes in the code
2. Save files (auto-reload will update the browser)
3. Run `npm run screenshots` to capture new state
4. Compare with previous screenshots
5. Iterate until satisfied

## Tips

- Keep the screenshots for before/after comparisons
- Use different viewport sizes to test responsiveness
- The browser window stays open so you can manually inspect too
- Check console output for layout metrics

## Troubleshooting

- **"ERR_CONNECTION_REFUSED"**: Make sure `npm run dev` is running
- **Browser won't launch**: Try installing latest Chrome/Edge
- **Screenshots empty**: Check if elements exist with correct selectors