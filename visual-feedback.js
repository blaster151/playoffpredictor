#!/usr/bin/env node

/**
 * Simple visual feedback script using Puppeteer (lighter than Playwright)
 * Run with: node visual-feedback.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function takeLayoutScreenshots() {
  console.log('🚀 Starting visual feedback capture...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for background operation
      defaultViewport: { width: 1600, height: 1000 }
    });
    
    const page = await browser.newPage();
    
    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Wait a bit for any dynamic content
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking screenshots...');
    
    // Ensure feedback directory exists
    const feedbackDir = path.join(process.cwd(), 'layout-feedback');
    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true });
    }
    
    // Full page screenshot
    await page.screenshot({ 
      path: path.join(feedbackDir, 'full-page.png'),
      fullPage: true 
    });
    
    // Header screenshot
    const headerElement = await page.$('nav');
    if (headerElement) {
      await headerElement.screenshot({ path: path.join(feedbackDir, 'header.png') });
    }
    
    // Main content screenshot
    const mainElement = await page.$('.nfl-container');
    if (mainElement) {
      await mainElement.screenshot({ path: path.join(feedbackDir, 'main-content.png') });
    }
    
    // Game area screenshot
    const gameElement = await page.$('.lg\\:col-span-1');
    if (gameElement) {
      await gameElement.screenshot({ path: path.join(feedbackDir, 'game-area.png') });
    }
    
    // Get layout metrics
    const metrics = await page.evaluate(() => {
      const container = document.querySelector('.nfl-container');
      const gameColumns = document.querySelectorAll('[class*="bg-blue-50"], [class*="bg-purple-50"], [class*="bg-red-50"]');
      
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        container: container ? {
          width: container.offsetWidth,
          height: container.offsetHeight,
          left: container.offsetLeft
        } : null,
        gameColumns: gameColumns.length,
        firstColumnWidth: gameColumns[0] ? gameColumns[0].offsetWidth : null
      };
    });
    
    console.log('📊 Layout Metrics:');
    console.log(`Viewport: ${metrics.viewport.width}x${metrics.viewport.height}`);
    if (metrics.container) {
      console.log(`Container: ${metrics.container.width}x${metrics.container.height}`);
      console.log(`Container utilization: ${Math.round((metrics.container.width / metrics.viewport.width) * 100)}% width`);
    }
    console.log(`Game columns: ${metrics.gameColumns}`);
    if (metrics.firstColumnWidth) {
      console.log(`First column width: ${metrics.firstColumnWidth}px`);
    }
    
    console.log('✅ Screenshots saved to layout-feedback/ directory');
    console.log('🔍 Open the PNG files to see the current layout');
    
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    
    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('💡 Make sure the dev server is running: npm run dev');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  takeLayoutScreenshots();
} catch (e) {
  console.log('📦 Puppeteer not found. Installing...');
  console.log('Run: npm install --save-dev puppeteer');
  console.log('Then run this script again.');
}