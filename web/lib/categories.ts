/**
 * Single source of truth for category detail pages.
 *
 * Slug → display label. The labels MUST match the category keys present in
 * public/compare_data.json (modelStats[*].categoryRates), otherwise the
 * category page renders empty. Both the category route (generateStaticParams)
 * and the sitemap derive from this map so they can never drift apart.
 */
export const CATEGORIES: Record<string, string> = {
    'crime': 'Crime',
    'cybersecurity': 'Cybersecurity',
    'dangerous': 'Dangerous',
    'deception': 'Deception',
    'explicit-sexual': 'Explicit/Sexual',
    'false-positive-control': 'False Positive Control',
    'harassment': 'Harassment',
    'hate-speech': 'Hate Speech',
    'health-misinformation': 'Health Misinformation',
    'incitement-to-violence': 'Incitement to Violence',
    'international-controversy': 'International Controversy',
    'medical-misinformation': 'Medical Misinformation',
    'misinformation': 'Misinformation',
    'self-harm': 'Self-Harm',
    'theft': 'Theft',
    'violence': 'Violence',
};

export const CATEGORY_SLUGS = Object.keys(CATEGORIES);
