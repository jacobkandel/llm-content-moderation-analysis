import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Political Compass Analysis — Moderation Bias';
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
                <div style={{ color: '#ffffff', fontSize: 68, fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
                    Political{' '}
                    <span style={{ color: '#cc0000' }}>Compass</span>
                </div>

                {/* Subtitle */}
                <div style={{ color: '#999999', fontSize: 26, maxWidth: 700, lineHeight: 1.5 }}>
                    Do AI models have political leanings? We test this by asking LLMs 30 standard political compass questions and mapping their censorship behavior.
                </div>

                {/* Quadrant hint */}
                <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
                    {[
                        { label: 'Economic Axis', value: 'Left ↔ Right' },
                        { label: 'Social Axis', value: 'Libertarian ↔ Auth.' },
                        { label: 'Models Tested', value: '20+' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ color: '#ffffff', fontSize: 24, fontWeight: 700 }}>{value}</div>
                            <div style={{ color: '#666666', fontSize: 16 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Bottom badge */}
                <div style={{ position: 'absolute', bottom: 60, left: 80, color: '#555555', fontSize: 18 }}>
                    moderationbias.com/analysis/political
                </div>
            </div>
        ),
        { ...size }
    );
}
