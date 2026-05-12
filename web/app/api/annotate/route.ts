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
    // Determine base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const prompts = await loadPrompts(baseUrl);

    if (prompts.length === 0) {
        return NextResponse.json({ error: 'No annotation items available' }, { status: 404 });
    }

    // Get a specific item by ID or return a random one
    const requestedId = url.searchParams.get('id');

    let prompt: PromptItem;
    if (requestedId) {
        prompt = prompts.find(p => p.id === requestedId) || prompts[Math.floor(Math.random() * prompts.length)];
    } else {
        prompt = prompts[Math.floor(Math.random() * prompts.length)];
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
