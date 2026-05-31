import { test, expect } from '@playwright/test';

const pages = [
    '/',
    '/leaderboard',
    '/compare',
    '/models',
    '/models/openai',
    '/models/openai/gpt-4o',
    '/categories',
    '/analysis/overview',
    '/analysis/summary',
    '/analysis/drift',
    '/analysis/significance',
    '/analysis/reliability',
    '/analysis/longitudinal',
    '/analysis/consensus',
    '/analysis/political',
    '/analysis/alignment',
    '/analysis/paternalism',
    '/analysis/clusters',
    '/analysis/triggers',
    '/analysis/iaa',
    '/analysis/overrefusal',
    '/prompts',
    '/annotate',
    '/glossary',
    '/methodology',
    '/about',
];

for (const path of pages) {
    test(`${path} — returns 200 and no error boundary`, async ({ page }) => {
        const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

        // Verify HTTP 200
        expect(response?.status()).toBe(200);

        // Verify no React error boundary rendered
        await expect(
            page.locator('text=Something went wrong').first()
        ).not.toBeVisible();

        await expect(
            page.locator('[data-testid="error-boundary"]').first()
        ).not.toBeVisible();

        // Basic sanity: page has a body
        await expect(page.locator('body')).toBeVisible();
    });
}
