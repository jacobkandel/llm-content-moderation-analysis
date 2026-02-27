import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const runtime = 'edge';
export const alt = 'Model Refusal Rate Analysis';
export const size = { width: 1200, height: 630 };

export default async function Image({ params }: { params: { modelId: string[] } }) {
    const rawId = params.modelId.join('/');

    // Handle favicon fetch using the existing utility logic, but without importing 
    // the TS module which might fail in Edge runtime if it relies on node APIs
    let domain = 'openai.com';
    let providerName = 'Unknown';
    let displayName = rawId;
    let refusalRate = '?';

    // Best effort mapping inline for Edge runtime
    const lower = rawId.toLowerCase();
    if (lower.includes('claude')) { domain = 'anthropic.com'; providerName = 'Anthropic'; }
    else if (lower.includes('gemini') || lower.includes('google')) { domain = 'deepmind.google'; providerName = 'Google'; }
    else if (lower.includes('mistral') || lower.includes('ministral')) { domain = 'mistral.ai'; providerName = 'Mistral AI'; }
    else if (lower.includes('qwen')) { domain = 'qwenlm.ai'; providerName = 'Alibaba / Qwen'; }
    else if (lower.includes('deepseek')) { domain = 'deepseek.com'; providerName = 'DeepSeek'; }
    else if (lower.includes('llama') || lower.includes('meta')) { domain = 'meta.com'; providerName = 'Meta'; }
    else if (lower.includes('command') || lower.includes('cohere')) { domain = 'cohere.com'; providerName = 'Cohere'; }

    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(to bottom right, #ffffff, #f1f5f9)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Branding Top */}
                <div style={{ position: 'absolute', top: 40, left: 40, display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 24, fontWeight: 'bold' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 12 }}>
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                    Moderation Bias
                </div>

                {/* Main Content Node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Logo Plate */}
                    <div style={{
                        width: 160,
                        height: 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'white',
                        borderRadius: 32,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                        marginBottom: 40
                    }}>
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                            width={96}
                            height={96}
                        />
                    </div>

                    <h1 style={{ fontSize: 72, fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0', textAlign: 'center' }}>
                        {displayName}
                    </h1>

                    <p style={{ fontSize: 32, color: '#64748b', margin: '0 0 60px 0' }}>
                        {providerName}
                    </p>

                    <div style={{ display: 'flex', background: '#0f172a', color: 'white', padding: '16px 48px', borderRadius: 100, fontSize: 32, fontWeight: 'bold', alignItems: 'center' }}>
                        Refusal Rate Analysis
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
