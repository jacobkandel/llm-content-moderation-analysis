import { test, expect } from '@playwright/test';

test.describe('Compare page smoke test', () => {
    test('loads and shows model selectors', async ({ page }) => {
        await page.goto('/compare');

        // Page title should be correct
        await expect(page).toHaveTitle(/Compare Models/i);

        // Model selectors must be present and enabled
        const modelASelect = page.locator('#model-a-select');
        const modelBSelect = page.locator('#model-b-select');
        await expect(modelASelect).toBeVisible({ timeout: 10_000 });
        await expect(modelBSelect).toBeVisible({ timeout: 10_000 });
        await expect(modelASelect).toBeEnabled();
        await expect(modelBSelect).toBeEnabled();

        // Should have at least one model option loaded
        const optionCount = await modelASelect.locator('option').count();
        expect(optionCount).toBeGreaterThan(0);
    });

    test('search box is visible and accepts input', async ({ page }) => {
        await page.goto('/compare');

        const searchBox = page.locator('#search-prompts');
        await expect(searchBox).toBeVisible({ timeout: 10_000 });

        await searchBox.fill('Should abortion be legal?');
        await expect(searchBox).toHaveValue('Should abortion be legal?');
    });

    test('category filter is visible', async ({ page }) => {
        await page.goto('/compare');

        const categoryFilter = page.locator('#filter-category');
        await expect(categoryFilter).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Homepage smoke test', () => {
    test('loads with correct heading', async ({ page }) => {
        await page.goto('/');

        const h1 = page.locator('h1');
        await expect(h1).toBeVisible();
        await expect(h1).toContainText('AI Models');
    });

    test('Compare Models CTA links to /compare', async ({ page }) => {
        await page.goto('/');

        const ctaLink = page.locator('a[href="/compare"]').first();
        await expect(ctaLink).toBeVisible();
    });
});

test.describe('About page smoke test', () => {
    test('loads and shows team section', async ({ page }) => {
        await page.goto('/about');

        await expect(page.locator('h1')).toBeVisible();
        await expect(page.getByText('Jacob Kandel')).toBeVisible();
    });
});
