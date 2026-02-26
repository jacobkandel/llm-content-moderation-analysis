import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Analysis Summary — Moderation Bias';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#800000' }} />

                {/* Eyebrow */}
                <div style={{ color: '#800000', fontSize: 20, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
                    Moderation Bias
                </div>

                {/* Title */}
                <div style={{ color: '#ffffff', fontSize: 72, fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
                    Analysis<br />
                    <span style={{ color: '#cc0000' }}>Executive Summary</span>
                </div>

                {/* Subtitle */}
                <div style={{ color: '#999999', fontSize: 28, maxWidth: 700, lineHeight: 1.5 }}>
                    See the high-level metrics, refusal heatmaps, and dataset composition across all LLM models tested in this environment.
                </div>

                {/* Bottom badge */}
                <div style={{ position: 'absolute', bottom: 60, left: 80, color: '#555555', fontSize: 18 }}>
                    moderationbias.com/analysis/summary
                </div>
            </div>
        ),
        { ...size }
    );
}
