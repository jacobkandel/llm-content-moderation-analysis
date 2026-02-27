import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

function getDataLastUpdated(): Date {
    try {
        const statsPath = path.join(process.cwd(), 'public', 'summary_stats.json');
        const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        if (stats.lastUpdated) return new Date(stats.lastUpdated);
    } catch { }
    return new Date('2026-02-12'); // fallback to last known date
}

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://moderationbias.com';
    const dataDate = getDataLastUpdated();
    const deployDate = new Date();

    return [
        {
            url: baseUrl,
            lastModified: deployDate,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/analysis/summary`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/reliability`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/significance`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/drift`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/political`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/paternalism`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/alignment`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/analysis/clusters`,
            lastModified: dataDate,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/analysis/triggers`,
            lastModified: dataDate,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/analysis/consensus`,
            lastModified: dataDate,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/audit`,
            lastModified: dataDate,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/compare`,
            lastModified: deployDate,
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        // Per-model landing pages
        ...(() => {
            try {
                const models: { id: string }[] = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'models.json'), 'utf8'));
                return models.map(m => ({
                    url: `${baseUrl}/models/${m.id}`,
                    lastModified: dataDate,
                    changeFrequency: 'weekly' as const,
                    priority: 0.8,
                }));
            } catch { return []; }
        })(),
        // Category landing pages
        ...['crime', 'cybersecurity', 'dangerous', 'deception', 'explicit-sexual', 'false-positive-control',
            'harassment', 'hate-speech', 'health-misinformation', 'incitement-to-violence',
            'paternalism', 'political', 'self-harm', 'weapons'].map(cat => ({
                url: `${baseUrl}/categories/${cat}`,
                lastModified: dataDate,
                changeFrequency: 'weekly' as const,
                priority: 0.7,
            })),
    ];
}
