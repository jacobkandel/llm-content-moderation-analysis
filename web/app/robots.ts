import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/*.json$'],
            disallow: ['/private/', '/api/'],
        },
        sitemap: 'https://moderationbias.com/sitemap.xml',
    };
}
