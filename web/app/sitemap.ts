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
            url: `${BASE_URL}/analysis/longitudinal`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/models`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        // Analysis Deep Dives
        ...[
            'consensus', 'political', 'drift', 'paternalism', 'significance', 'summary', 'overview', 'triggers', 'clusters', 'alignment', 'reliability'
        ].map(slug => ({
            url: `${BASE_URL}/analysis/${slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        })),
        // Categories
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
        for (const model of models as any) {
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
