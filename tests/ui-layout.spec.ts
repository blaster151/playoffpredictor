import { test, expect } from '@playwright/test';

test.describe('NFL Playoff Predictor UI Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should display the header correctly', async ({ page }) => {
    // Check if header is visible and properly spaced
    const header = page.locator('nav');
    await expect(header).toBeVisible();
    
    // Check if logo and title are visible
    const logo = page.locator('img[alt="NFL"]');
    const title = page.locator('h1:has-text("Playoff Predictors")');
    
    await expect(logo).toBeVisible();
    await expect(title).toBeVisible();
    
    // Take a screenshot of the header
    await page.locator('nav').screenshot({ path: 'test-results/header-layout.png' });
  });

  test('should display game columns efficiently', async ({ page }) => {
    // Wait for any schedule generation to complete or show the generate button
    await page.waitForTimeout(2000);
    
    // Check if the main content area is visible
    const mainContent = page.locator('.lg\\:col-span-1');
    await expect(mainContent).toBeVisible();
    
    // Take a full page screenshot to see overall layout
    await page.screenshot({ 
      path: 'test-results/full-layout.png',
      fullPage: true 
    });
    
    // Take a focused screenshot of the game area
    await mainContent.screenshot({ 
      path: 'test-results/game-columns.png' 
    });
  });

  test('should have proper spacing and width utilization', async ({ page }) => {
    // Set viewport to a common desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Wait for layout to settle
    await page.waitForTimeout(1000);
    
    // Check the main container width utilization
    const container = page.locator('.nfl-container');
    await expect(container).toBeVisible();
    
    const containerBox = await container.boundingBox();
    console.log('Container dimensions:', containerBox);
    
    // Take a full page screenshot at desktop resolution
    await page.screenshot({ 
      path: 'test-results/desktop-layout-1920x1080.png',
      fullPage: true 
    });
    
    // Also test at a smaller resolution
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'test-results/smaller-desktop-layout-1366x768.png',
      fullPage: true 
    });
  });

  test('should handle schedule generation UI', async ({ page }) => {
    // Look for the "Generate New Schedule" button
    const generateButton = page.locator('button:has-text("Generate New Schedule")');
    
    if (await generateButton.isVisible()) {
      console.log('No schedule loaded - Generate button is visible');
      
      // Take screenshot showing the no-schedule state
      await page.screenshot({ 
        path: 'test-results/no-schedule-state.png',
        fullPage: true 
      });
      
      // Optionally click the button to start generation
      // await generateButton.click();
      // await page.waitForTimeout(5000);
      // await page.screenshot({ 
      //   path: 'test-results/schedule-generating.png',
      //   fullPage: true 
      // });
    } else {
      console.log('Schedule appears to be loaded');
      
      // Look for game columns
      const gameColumns = page.locator('[class*="bg-blue-50"], [class*="bg-purple-50"], [class*="bg-red-50"]');
      const columnCount = await gameColumns.count();
      console.log('Number of game columns found:', columnCount);
      
      if (columnCount > 0) {
        await page.screenshot({ 
          path: 'test-results/schedule-loaded-state.png',
          fullPage: true 
        });
      }
    }
  });
});

test.describe('Visual Regression Tests', () => {
  test('header layout should match expected design', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take a focused screenshot of just the header for comparison
    const header = page.locator('nav');
    await expect(header).toHaveScreenshot('header-comparison.png');
  });

  test('main layout should use screen space efficiently', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of the main content area
    const mainGrid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-3');
    await expect(mainGrid).toHaveScreenshot('main-grid-layout.png');
  });
});