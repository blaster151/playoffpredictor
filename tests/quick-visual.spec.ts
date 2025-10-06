import { test, expect } from '@playwright/test';

/**
 * Quick visual feedback test for layout changes
 * Run this with: npx playwright test tests/quick-visual.spec.ts --headed
 */
test.describe('Quick Visual Feedback', () => {
  test('layout snapshot for feedback', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Set a good viewport size for development
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking layout screenshots...');
    
    // Create screenshots directory
    await page.screenshot({ 
      path: 'layout-feedback/full-page.png',
      fullPage: true 
    });
    
    // Header screenshot
    const header = page.locator('nav');
    if (await header.isVisible()) {
      await header.screenshot({ path: 'layout-feedback/header.png' });
    }
    
    // Main content screenshot
    const mainContent = page.locator('.nfl-container');
    if (await mainContent.isVisible()) {
      await mainContent.screenshot({ path: 'layout-feedback/main-content.png' });
    }
    
    // Game columns screenshot (if visible)
    const gameArea = page.locator('.lg\\:col-span-1');
    if (await gameArea.isVisible()) {
      await gameArea.screenshot({ path: 'layout-feedback/game-area.png' });
    }
    
    // Log some layout metrics
    const containerBox = await mainContent.boundingBox();
    const viewportSize = page.viewportSize();
    
    console.log('📊 Layout Metrics:');
    console.log(`Viewport: ${viewportSize?.width}x${viewportSize?.height}`);
    console.log(`Container: ${containerBox?.width}x${containerBox?.height}`);
    console.log(`Container utilization: ${containerBox && viewportSize ? Math.round((containerBox.width / viewportSize.width) * 100) : 'N/A'}% width`);
    
    // Check if we have the improved spacing
    const gameColumns = page.locator('[class*="bg-blue-50"], [class*="bg-purple-50"], [class*="bg-red-50"]');
    const columnCount = await gameColumns.count();
    console.log(`🎮 Game columns found: ${columnCount}`);
    
    if (columnCount > 0) {
      const firstColumn = gameColumns.first();
      const columnBox = await firstColumn.boundingBox();
      console.log(`📐 First column size: ${columnBox?.width}x${columnBox?.height}`);
    }
    
    console.log('✅ Screenshots saved to layout-feedback/ directory');
  });
});