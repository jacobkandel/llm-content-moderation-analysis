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

    // Analysis deep dive pages to surface in the feed
    const analysisPages = [
      { slug: 'summary', title: 'Executive Summary', desc: 'High-level summary of LLM censorship, refusal rates, and key findings across all audited models.' },
      { slug: 'overview', title: 'Model Overview', desc: 'Refusal rate heatmaps and radar charts visualising how each model handles sensitive categories.' },
      { slug: 'drift', title: 'Model Drift & Stability', desc: 'Tracking how LLM censorship behaviours change over time — are models getting more or less restrictive?' },
      { slug: 'consensus', title: 'Council Consensus', desc: 'Do AI models agree with each other on what is safe? Explore inter-model agreement rates.' },
      { slug: 'political', title: 'AI Political Compass', desc: 'Mapping the structural political biases of LLMs across economic and social axes.' },
      {
        slug: 'reliability', title: 'Model Reliability', desc: 'Internal consistency and self-agreement analysis — how reliable is each model moderation?' },
      { slug: 'longitudinal', title: 'Longitudinal Analysis', desc: 'Interactive timeline tracking the evolution of AI content moderation policies over months.' },
      { slug: 'alignment', title: 'Alignment Tax', desc: 'The Pareto frontier: which models give the best helpfulness-to-safety tradeoff at the lowest cost?' },
      { slug: 'clusters', title: 'Semantic Clusters', desc: 'Explore visually grouped refused prompts by semantic similarity to find hidden moderation patterns.' },
      {
        slug: 'significance', title: 'Statistical Significance', desc: 'Pairwise McNemar's tests separating signal from noise in model refusal rate differences.' },
      { slug: 'triggers', title: 'Censorship Triggers', desc: 'Which specific words and linguistic patterns automatically trigger AI content refusals?' },
      { slug: 'paternalism', title: 'Paternalism in AI', desc: 'Do AI models gatekeep differently based on who they think is asking? Persona-based refusal analysis.' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Moderation Bias - LLM Censorship Tracker</title>
    <link>${baseUrl}</link>
    <description>Tracking the political and social biases of Llama-3, GPT-4, Claude, and other AI models via live, automated red-teaming audits.</description>
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

    // Add analysis deep dive pages
    for (const page of analysisPages) {
      xml += `
    <item>
      <title>${page.title} — Moderation Bias</title>
      <link>${baseUrl}/analysis/${page.slug}</link>
      <guid>${baseUrl}/analysis/${page.slug}</guid>
      <pubDate>${lastUpdated.toUTCString()}</pubDate>
      <description>${page.desc}</description>
    </item>`;
    }

    // Add items for the top models
    const recentModels = [...models].slice(0, 8);

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
