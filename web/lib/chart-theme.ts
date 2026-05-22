/**
 * Shared chart theme for consistent, premium-looking Recharts visualizations.
 * Uses the UChicago brand palette with gradients and polished styling.
 */

// ── Color Palette ───────────────────────────────────────────────────────────
// Curated to work on both light and dark backgrounds via HSL CSS variables.

/** Primary palette for multi-series charts (ordered for visual distinction) */
export const CHART_COLORS = [
    '#800000', // Maroon (brand primary)
    '#2563eb', // Blue
    '#16a34a', // Green
    '#ea580c', // Orange
    '#8b5cf6', // Purple
    '#0891b2', // Cyan
    '#e11d48', // Rose
    '#ca8a04', // Amber
    '#6366f1', // Indigo
    '#059669', // Emerald
] as const;

/** Semantic colors */
export const SEMANTIC_COLORS = {
    refusal: '#A4343A',   // Brick red
    safe: '#275D38',      // Forest green
    brand: '#800000',     // Maroon
    brandDark: '#9a0000',
    warning: '#eab308',
    neutral: '#737373',
} as const;

/** Gradient pairs for bar/area fills: [start, end] */
export const GRADIENT_PAIRS = [
    ['#800000', '#b91c1c'],  // Maroon → lighter red
    ['#1d4ed8', '#3b82f6'],  // Blue
    ['#15803d', '#22c55e'],  // Green
    ['#c2410c', '#f97316'],  // Orange
    ['#7c3aed', '#a78bfa'],  // Purple
] as const;

/** Pie/donut chart palette — more muted for cleaner look */
export const PIE_COLORS = ['#800000', '#4b5563', '#9ca3af', '#d1d5db', '#e5e7eb'];

// ── Tooltip Styling ─────────────────────────────────────────────────────────

/** Apply to Recharts <Tooltip contentStyle={TOOLTIP_STYLE} /> */
export const TOOLTIP_STYLE: React.CSSProperties = {
    backgroundColor: 'hsl(var(--popover))',
    borderColor: 'hsl(var(--border))',
    color: 'hsl(var(--popover-foreground))',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
    padding: '12px 16px',
    fontSize: '13px',
    lineHeight: '1.5',
};

/** Apply to Recharts <Tooltip cursor={TOOLTIP_CURSOR} /> for bar charts */
export const TOOLTIP_CURSOR = {
    fill: 'hsl(var(--muted))',
    opacity: 0.15,
};

// ── Axis Styling ────────────────────────────────────────────────────────────

export const AXIS_TICK_STYLE = {
    fill: 'hsl(var(--muted-foreground))',
    fontSize: 11,
};

export const GRID_STYLE = {
    stroke: 'hsl(var(--border))',
    strokeDasharray: '3 3',
    opacity: 0.5,
};

// ── Gradient Definitions (JSX) ──────────────────────────────────────────────

/**
 * Drop this inside a Recharts <defs> block to register gradient fills.
 * Then use fill="url(#chartGradient0)" etc.
 *
 * Usage:
 *   <BarChart>
 *     <defs>{chartGradientDefs()}</defs>
 *     <Bar fill="url(#chartGradient0)" />
 *   </BarChart>
 */
export function chartGradientDefs() {
    return GRADIENT_PAIRS.map(([start, end], i) => (
        <linearGradient key={i} id={`chartGradient${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={start} stopOpacity={0.9} />
            <stop offset="100%" stopColor={end} stopOpacity={0.7} />
        </linearGradient>
    ));
}

/** A single brand gradient (maroon) for simple single-series charts */
export function brandGradientDef(id = 'brandGradient') {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#800000" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.65} />
        </linearGradient>
    );
}

/** Horizontal gradient for horizontal bar charts */
export function brandGradientHorizontalDef(id = 'brandGradientH') {
    return (
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#800000" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#dc2626" stopOpacity={0.75} />
        </linearGradient>
    );
}

// ── Animation Config ────────────────────────────────────────────────────────

export const ANIMATION_DURATION = 800;
export const ANIMATION_EASING = 'ease-out' as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get a color from the palette by index (wraps around) */
export function getChartColor(index: number): string {
    return CHART_COLORS[index % CHART_COLORS.length];
}
