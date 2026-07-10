import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Moderation Bias — LLM Censorship Benchmark';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Root Open Graph / Twitter card (1200x630). Used for the homepage and any page
// without its own opengraph-image, replacing the mis-sized square heatmap.png.
export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: '#0a0a0a',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#800000' }} />

                <div style={{ color: '#e07a7a', fontSize: 22, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
                    Open-Source AI Research
                </div>

                <div style={{ color: '#ffffff', fontSize: 76, fontWeight: 900, lineHeight: 1.05, marginBottom: 28, maxWidth: 1000 }}>
                    See How AI Models Differ in{' '}
                    <span style={{ color: '#e07a7a' }}>Censorship &amp; Bias</span>
                </div>

                <div style={{ color: '#a0a0a0', fontSize: 30, maxWidth: 860, lineHeight: 1.4 }}>
                    A live benchmark of content-moderation refusal rates across 30+ LLMs, with biweekly automated audits and statistical significance testing.
                </div>

                <div style={{ position: 'absolute', bottom: 60, left: 80, color: '#666666', fontSize: 20 }}>
                    moderationbias.com
                </div>
            </div>
        ),
        { ...size }
    );
}
