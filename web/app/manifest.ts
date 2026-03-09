import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Moderation Bias',
        short_name: 'ModBias',
        description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude via automated red-teaming.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0C15',
        theme_color: '#0B0C15',
        icons: [
            {
                src: '/icon?size=32x32',
                sizes: '32x32',
                type: 'image/png',
            },
            {
                src: '/icon?size=192x192',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon?size=512x512',
                sizes: '512x512',
                type: 'image/png',
            }
        ],
    };
}
