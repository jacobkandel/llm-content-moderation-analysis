'use client';

import { usePathname } from 'next/navigation';

export default function JsonLd() {
    const pathname = usePathname();

    const jsonLd: any[] = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Moderation Bias - Into the Black Box',
            url: 'https://www.moderationbias.com',
            description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
            potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.moderationbias.com/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'LLM Content Moderation Audit Log',
            description: 'A comprehensive benchmark of content moderation biases in LLMs like Llama-3, GPT-4, and Claude.',
            url: 'https://www.moderationbias.com/data/audit_log.csv',
            sameAs: 'https://github.com/jacobkandel/llm-content-moderation-analysis',
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
                    contentUrl: 'https://www.moderationbias.com/data/audit_log.csv',
                },
            ],
        },
        {
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
        },
    ];

    if (pathname && pathname !== '/') {
        const segments = pathname.split('/').filter(Boolean);
        const itemListElement = [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://www.moderationbias.com',
            },
        ];

        let currentPath = '';
        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            // Format nicely: "analysis" -> "Analysis", "gpt-4" -> "Gpt 4"
            const name = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // If it's a model ID segment, it might be URL-encoded, so decode it
            // but the UI typically uses human-readable names there if possible. The pathname provides URL segments.
            itemListElement.push({
                '@type': 'ListItem',
                position: index + 2,
                name: decodeURIComponent(name),
                item: `https://www.moderationbias.com${currentPath}`,
            });
        });

        jsonLd.push({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement,
        });
    }

    return (
        <section>
            {jsonLd.map((data, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
                />
            ))}
        </section>
    );
}
