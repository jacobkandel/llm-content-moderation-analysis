import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const baseUrl = 'https://moderationbias.com';

    // Load models to generate feed items
    const modelsPath = path.join(process.cwd(), 'public', 'models.json');
    const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));

    // Load summary stats for the last updated date
    const statsPath = path.join(process.cwd(), 'public', 'summary_stats.json');
    const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    const lastUpdated = new Date(stats.lastUpdated || new Date());

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Moderation Bias - LLM Censorship Tracker</title>
    <link>${baseUrl}</link>
    <description>Tracking the political and social biases of Llama-3, GPT-4, Claude, and other AI models.</description>
    <language>en-us</language>
    <lastBuildDate>${lastUpdated.toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    
    <item>
      <title>Latest Audit Data: ${lastUpdated.toLocaleDateString()}</title>
      <link>${baseUrl}/analysis/summary</link>
      <guid>${baseUrl}/analysis/summary#${lastUpdated.getTime()}</guid>
      <pubDate>${lastUpdated.toUTCString()}</pubDate>
      <description>We just published a fresh audit of AI content moderation thresholds across ${models.length} models. Check out the latest refusal rates and policy alignments.</description>
    </item>
`;

    // Add an item for the top 5 models to surface them in the feed
    const recentModels = [...models].slice(0, 5); // Assuming the list order is loosely chronological/relevant

    for (const model of recentModels) {
      xml += `
    <item>
      <title>Model Profile: ${model.display_name}</title>
      <link>${baseUrl}/models/${model.id}</link>
      <guid>${baseUrl}/models/${model.id}</guid>
      <pubDate>${lastUpdated.toUTCString()}</pubDate>
      <description>View the refusal rate, category breakdown, and behavioral analysis for ${model.display_name} (${model.provider}). Does it restrict political or controversial speech?</description>
    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=86400, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating feed', { status: 500 });
  }
}
