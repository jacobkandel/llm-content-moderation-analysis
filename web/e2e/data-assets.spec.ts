import { test, expect } from '@playwright/test';

const dataAssets: { path: string; description: string }[] = [
    { path: '/compare_data.json', description: 'compare data' },
    { path: '/models.json', description: 'models list' },
    { path: '/summary_stats.json', description: 'summary statistics' },
    { path: '/significance_pairwise.json', description: 'significance pairwise data' },
    { path: '/last_audit.json', description: 'last audit data' },
];

for (const asset of dataAssets) {
    test(`${asset.path} — returns 200 with valid JSON`, async ({ request, baseURL }) => {
        const response = await request.get(`${baseURL}${asset.path}`);

        // Must return 200
        expect(response.status()).toBe(200);

        // Content-Type should indicate JSON
        const contentType = response.headers()['content-type'] ?? '';
        expect(contentType).toContain('json');

        // Body must be parseable JSON
        const text = await response.text();
        let parsed: unknown;
        expect(() => {
            parsed = JSON.parse(text);
        }).not.toThrow();

        // Must be non-empty (object or array)
        expect(parsed).toBeTruthy();
        if (Array.isArray(parsed)) {
            expect((parsed as unknown[]).length).toBeGreaterThan(0);
        } else {
            expect(Object.keys(parsed as Record<string, unknown>).length).toBeGreaterThan(0);
        }
    });
}
