/**
 * JsonLd — Server Component (no 'use client')
 * Renders structured data as JSON-LD in a <script> tag server-side so
 * Googlebot sees it in the initial HTML without needing JS execution.
 *
 * FAQPage is ONLY rendered on the homepage (pathname = '/').
 * BreadcrumbList is generated from the path prop.
 * WebSite and Dataset schemas are rendered on every page.
 */

const BASE = 'https://moderationbias.com';

interface JsonLdProps {
    pathname: string; // passed from layout/page, no usePathname() needed
}

export default function JsonLd({ pathname }: JsonLdProps) {
    const jsonLd: object[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Moderation Bias',
            url: BASE,
            description: 'Benchmarking content-moderation bias in large language models across 30+ AI systems and 2,300+ prompts.',
            potentialAction: {
                '@type': 'SearchAction',
                target: `${BASE}/prompts?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'LLM Content Moderation Audit Log',
            description: 'A comprehensive benchmark of content-moderation biases across 30+ large language models (GPT-4o, Claude, Gemini, Llama, DeepSeek, Qwen, Mistral), with biweekly automated audits and statistical significance testing.',
            url: `${BASE}/data`,
            sameAs: [
                'https://github.com/jacobkandel/llm-content-moderation-analysis',
                'https://doi.org/10.5281/zenodo.20262255',
                'https://huggingface.co/datasets/jmk9494/moderation-bias-benchmark',
            ],
            identifier: {
                '@type': 'PropertyValue',
                propertyID: 'DOI',
                value: '10.5281/zenodo.20262255',
            },
            keywords: ['LLM', 'content moderation', 'AI bias', 'censorship', 'refusal rate', 'AI safety', 'benchmark'],
            isAccessibleForFree: true,
            license: 'https://creativecommons.org/licenses/by/4.0/',
            creator: {
                '@type': 'Person',
                name: 'Jacob Kandel',
                url: 'https://github.com/jacobkandel',
            },
            distribution: [
                {
                    '@type': 'DataDownload',
                    encodingFormat: 'text/csv',
                    // Actual file is gzip-compressed CSV on Vercel Blob
                    contentUrl: 'https://oeqbf51ent3zxva1.public.blob.vercel-storage.com/data/audit_log.csv.gz',
                },
            ],
        },
    ];

    // FAQPage schema — only on the homepage where the FAQ content is visible
    if (pathname === '/') {
        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'Which AI model censors the most content?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Based on our live audit, refusal rates vary significantly across models. Visit our compare page to see the current rankings.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Does GPT-4 censor political content?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Our benchmark tests GPT-4o and GPT-4o-mini across political, social, and controversial prompts. Results are published on our Model Comparison and Audit Log pages.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Is Claude more restrictive than GPT-4?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Claude (Anthropic) and GPT-4 (OpenAI) show different refusal patterns across categories. Use our Compare page to run a live side-by-side analysis with statistical significance testing.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'How is AI censorship measured?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'We use automated red-teaming: hundreds of prompts across categories like political speech, health information, and controversial topics are submitted to each model. Responses are evaluated for refusal or restriction using a standardized verdict system.',
                    },
                },
            ],
        });
    }

    // BreadcrumbList — generated from pathname for all non-root pages
    if (pathname && pathname !== '/') {
        const segments = pathname.split('/').filter(Boolean);
        const itemListElement: object[] = [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: BASE,
            },
        ];

        let currentPath = '';
        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const name = decodeURIComponent(
                segment.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            );
            itemListElement.push({
                '@type': 'ListItem',
                position: index + 2,
                name,
                item: `${BASE}${currentPath}`,
            });
        });

        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement,
        });
    }

    return (
        <>
            {jsonLd.map((data, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
                />
            ))}
        </>
    );
}
