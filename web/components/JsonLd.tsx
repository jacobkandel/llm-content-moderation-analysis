export default function JsonLd() {
    const jsonLd = [
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Moderation Bias - Into the Black Box',
            url: 'https://moderationbias.com',
            description: 'Tracking the political and social biases of Llama-3, GPT-4, and Claude.',
            potentialAction: {
                '@type': 'SearchAction',
                target: 'https://moderationbias.com/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'LLM Content Moderation Audit Log',
            description: 'A comprehensive benchmark of content moderation biases in LLMs like Llama-3, GPT-4, and Claude.',
            url: 'https://moderationbias.com/data/audit_log.csv',
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
                    contentUrl: 'https://moderationbias.com/data/audit_log.csv',
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
