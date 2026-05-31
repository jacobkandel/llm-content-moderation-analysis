import { MetadataRoute } from 'next';
import models from '../public/models.json';

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
        // Analysis Deep Dives (all 14)
        ...[
            'consensus', 'political', 'drift', 'paternalism', 'significance',
            'summary', 'overview', 'triggers', 'clusters', 'alignment',
            'reliability', 'iaa', 'overrefusal', 'longitudinal'
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
        // Category detail pages
        ...[
            'crime', 'cybersecurity', 'dangerous', 'deception', 'explicit-sexual',
            'false-positive-control', 'harassment', 'hate-speech', 'health-misinformation',
            'incitement-to-violence', 'paternalism', 'political', 'self-harm', 'weapons'
        ].map(cat => ({
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
