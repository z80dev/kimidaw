import { test, expect } from '@playwright/test';

test.describe('DAW Smoke Tests', () => {
  test('app loads and shows enable audio button', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await expect(page.locator('#root')).toBeVisible();
    
    // Should show loading initially then content
    await expect(page.locator('text=Enable Audio')).toBeVisible({ timeout: 10000 });
  });

  test('can enable audio context', async ({ page }) => {
    await page.goto('/');
    
    // Click enable audio
    await page.click('text=Enable Audio');
    
    // Should show capability matrix
    await expect(page.locator('text=Capability Matrix')).toBeVisible();
  });

  test('keyboard midi mode works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Enable Audio');
    
    // Enable keyboard midi mode
    await page.keyboard.press('Shift+K');
    
    // Press a key - should not throw
    await page.keyboard.press('a');
  });
});
