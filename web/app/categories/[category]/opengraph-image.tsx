import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Category Analysis';
export const size = { width: 1200, height: 630 };

export default async function Image({ params }: { params: { category: string } }) {
    // Format the category slug into Title Case
    const categoryTitle = params.category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', width: '100%', padding: '0 120px' }}>
                    <div style={{ color: '#0f172a', fontWeight: 'bold', fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
                        Category Analysis
                    </div>
                    <h1 style={{ fontSize: 84, fontWeight: 900, color: '#0f172a', margin: '0 0 60px 0', textAlign: 'center', lineHeight: 1.1 }}>
                        {categoryTitle}
                    </h1>

                    <div style={{ display: 'flex', background: '#0f172a', color: 'white', padding: '16px 48px', borderRadius: 100, fontSize: 32, fontWeight: 'bold', alignItems: 'center' }}>
                        View Category Insights
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
