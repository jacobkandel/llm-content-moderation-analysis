import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/annotate
 * Returns a random prompt from the publicly-available prompts_list.json.
 * This works on Vercel because it fetches from the public URL rather than the filesystem.
 */

interface PromptItem {
    id: string;
    text: string;
    category: string;
    source: string;
}

let cachedPrompts: PromptItem[] | null = null;

async function loadPrompts(baseUrl: string): Promise<PromptItem[]> {
    if (cachedPrompts && cachedPrompts.length > 0) return cachedPrompts;

    try {
        const url = `${baseUrl}/prompts_list.json`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error(`Failed to fetch prompts: ${res.status}`);
        const data: PromptItem[] = await res.json();
        // Only include hand-written prompts for human annotation (higher quality)
        cachedPrompts = data.filter(p => p.source === 'Hand-Written' && p.text.length > 20);
        return cachedPrompts;
    } catch (e) {
        console.error('Failed to load prompts:', e);
        return [];
    }
}

export async function GET(request: NextRequest) {
    // If on a Vercel preview deployment, Vercel Protection blocks server-to-server fetches.
    // To fix this, we fetch the prompts from the public production URL or localhost.
    const url = new URL(request.url);
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const baseUrl = isLocal ? `${url.protocol}//${url.host}` : 'https://www.moderationbias.com';

    const prompts = await loadPrompts(baseUrl);

    if (prompts.length === 0) {
        return NextResponse.json({ error: 'No annotation items available' }, { status: 404 });
    }

    const requestedId = url.searchParams.get('id');
    const excludeParam = url.searchParams.get('exclude');
    const excludedIds = excludeParam ? excludeParam.split(',') : [];

    // Filter out already annotated prompts
    const availablePrompts = prompts.filter(p => !excludedIds.includes(p.id));

    if (availablePrompts.length === 0) {
        return NextResponse.json({ error: 'No more annotation items available' }, { status: 404 });
    }

    let prompt: PromptItem;
    if (requestedId) {
        prompt = prompts.find(p => p.id === requestedId) || availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    } else {
        prompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
    }

    // Strip the "You are a content moderator..." framing to get just the user post
    let cleanedText = prompt.text;
    // Common framing patterns to remove
    const framingPatterns = [
        /^You are a content moderator\.\s*/i,
        /A user posted:?\s*/i,
        /A user shared:?\s*/i,
        /A user posted a comment:?\s*/i,
        /This is flagged (?:under our policy )?(?:for|as) [^.]+\.\s*/gi,
        /Should this post be ALLOWED or REMOVED\?\s*/gi,
        /State your verdict and reasoning\.\s*/gi,
    ];
    for (const pattern of framingPatterns) {
        cleanedText = cleanedText.replace(pattern, '');
    }
    cleanedText = cleanedText.replace(/^['"]|['"]$/g, '').trim();

    return NextResponse.json({
        item: {
            id: prompt.id,
            model: 'human-review',
            promptText: cleanedText || prompt.text,
            responseText: '',
            aiLabel: '',
            category: prompt.category,
        },
        totalAvailable: prompts.length,
    });
}
