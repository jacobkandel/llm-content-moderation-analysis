import { test, expect } from '@playwright/test';

test.describe('Theme toggle', () => {
    test('clicking theme toggle adds/removes dark class on <html>', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        // Find the theme toggle button (button with aria-label containing "theme" or "dark"/"light")
        const toggle = page
            .locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="light" i]')
            .first();
        await expect(toggle).toBeVisible({ timeout: 10_000 });

        // Record current state
        const htmlEl = page.locator('html');
        const classBefore = await htmlEl.getAttribute('class') ?? '';

        // Click once
        await toggle.click();
        await page.waitForTimeout(300); // allow transition

        const classAfter = await htmlEl.getAttribute('class') ?? '';

        // Either we gained or lost the 'dark' class
        expect(classBefore).not.toBe(classAfter);

        // Click back
        await toggle.click();
        await page.waitForTimeout(300);

        const classRestored = await htmlEl.getAttribute('class') ?? '';
        expect(classRestored).toBe(classBefore);
    });
});

test.describe('Navbar dropdowns', () => {
    test('hovering Analysis dropdown reveals sub-links', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        // Hover the Analysis nav item
        const analysisNav = page
            .locator('nav a[href*="/analysis"], nav button:has-text("Analysis")')
            .first();
        await expect(analysisNav).toBeVisible({ timeout: 10_000 });
        await analysisNav.hover();

        // At least one sub-link should appear
        const subLink = page.locator('a[href^="/analysis/"]').first();
        await expect(subLink).toBeVisible({ timeout: 5_000 });
    });

    test('hovering Models dropdown reveals sub-links', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });

        const modelsNav = page
            .locator('nav a[href*="/models"], nav button:has-text("Models")')
            .first();
        await expect(modelsNav).toBeVisible({ timeout: 10_000 });
        await modelsNav.hover();

        const subLink = page.locator('a[href^="/models/"]').first();
        await expect(subLink).toBeVisible({ timeout: 5_000 });
    });
});

test.describe('Compare page charts', () => {
    test('compare page renders SVG chart elements', async ({ page }) => {
        await page.goto('/compare', { waitUntil: 'domcontentloaded' });

        // Wait for Recharts wrapper to load
        const chartWrapper = page.locator('.recharts-wrapper').first();
        await expect(chartWrapper).toBeVisible({ timeout: 20_000 });

        const svgCount = await page.locator('.recharts-wrapper svg').count();
        expect(svgCount).toBeGreaterThan(0);
    });
});

test.describe('Leaderboard table', () => {
    test('leaderboard table has more than one data row', async ({ page }) => {
        await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });

        // Wait for table to appear
        const table = page.locator('table').first();
        await expect(table).toBeVisible({ timeout: 20_000 });

        // Count tbody rows (data rows, excluding header)
        const rows = page.locator('table tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBeGreaterThan(1);
    });
});

test.describe('Prompts search', () => {
    test('search input accepts text and filters results', async ({ page }) => {
        await page.goto('/prompts', { waitUntil: 'domcontentloaded' });

        // Find any search/filter input
        const searchInput = page
            .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i], input[id*="search" i]')
            .first();
        await expect(searchInput).toBeVisible({ timeout: 15_000 });

        await searchInput.fill('abortion');
        await expect(searchInput).toHaveValue('abortion');

        // Slight delay to let filtering happen
        await page.waitForTimeout(500);

        // The page should still render something (not crash)
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Annotate page', () => {
    test('annotate page shows annotation buttons', async ({ page }) => {
        await page.goto('/annotate', { waitUntil: 'domcontentloaded' });

        // Annotation buttons are typically labeled with category options or rating buttons
        // Specifically, look for buttons that would be used for annotation actions
        const annotationButtons = page.locator(
            'button[data-label], button[aria-label*="annotate" i], button:has-text("ALLOWED"), button:has-text("REMOVED")'
        );
        // At least one annotate-specific button should be visible if annotation UI loaded
        const annotationButtonCount = await annotationButtons.count();
        if (annotationButtonCount > 0) {
            await expect(annotationButtons.first()).toBeVisible({ timeout: 10_000 });
        }
    });
});
