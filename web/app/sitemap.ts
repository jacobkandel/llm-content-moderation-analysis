import { MetadataRoute } from 'next';
import models from '../public/models.json';
import { CATEGORY_SLUGS } from '@/lib/categories';

const BASE_URL = 'https://moderationbias.com';

export default function sitemap(): MetadataRoute.Sitemap {
    const sitemapData: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${BASE_URL}/compare`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/leaderboard`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/models`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/categories`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        // Analysis Deep Dives (all 15)
        ...[
            'consensus', 'political', 'drift', 'paternalism', 'significance',
            'summary', 'overview', 'triggers', 'clusters', 'alignment',
            'reliability', 'iaa', 'overrefusal', 'longitudinal', 'family'
        ].map(slug => ({
            url: `${BASE_URL}/analysis/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
        // Top-level pages (all included now)
        ...['/data', '/annotate', '/prompts', '/glossary', '/methodology', '/about'].map(path => ({
            url: `${BASE_URL}${path}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        })),
        // Category detail pages — derived from the same source as the route so the
        // sitemap can never list a slug that renders a 404.
        ...CATEGORY_SLUGS.map(cat => ({
            url: `${BASE_URL}/categories/${cat}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
        }))
    ];

    try {
        // Provider index pages (e.g. /models/openai) — were missing before
        const providers = [...new Set((models as any[]).map((m: any) => m.id?.split('/')[0]).filter(Boolean))];
        for (const provider of providers) {
            sitemapData.push({
                url: `${BASE_URL}/models/${provider}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }
        // Individual model detail pages
        for (const model of models as any[]) {
            if (model.id) {
                sitemapData.push({
                    url: `${BASE_URL}/models/${model.id}`,
                    lastModified: new Date(),
                    changeFrequency: 'weekly',
                    priority: 0.7,
                });
            }
        }
    } catch (e) {
        console.error("Failed to generate sitemap for models", e);
    }

    return sitemapData;
}
