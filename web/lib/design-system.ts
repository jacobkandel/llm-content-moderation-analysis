/**
 * Design System — single source of truth for reusable Tailwind class strings.
 * Import these in components instead of writing class strings inline.
 *
 * Color tokens (text-brand, bg-safe, text-refusal, etc.) live in globals.css.
 */

// ─── Typography ─────────────────────────────────────────────────────────────

export const typography = {
    pageTitle: 'text-2xl md:text-3xl font-bold tracking-tight text-foreground',
    sectionHeading: 'text-lg font-bold text-foreground',
    subsectionHeading: 'text-base font-semibold text-foreground',
    label: 'text-xs font-semibold text-muted-foreground uppercase tracking-wide',
    bodyText: 'text-sm text-foreground',
    bodyTextMuted: 'text-sm text-muted-foreground',
    metricLarge: 'text-5xl font-black text-brand',
    metricMedium: 'text-3xl font-bold text-foreground',
    mono: 'font-mono text-xs text-muted-foreground',
} as const;

// ─── Components ─────────────────────────────────────────────────────────────

export const components = {
    // Cards
    card: 'bg-card rounded-2xl border border-border shadow-sm p-6',
    cardHover: 'bg-card rounded-2xl border border-border shadow-sm p-6 hover:shadow-md hover:border-brand/30 transition-all',

    // Buttons
    buttonPrimary: 'inline-flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium text-sm rounded-lg hover:bg-brand-dark transition-colors',
    buttonSecondary: 'inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground font-medium text-sm rounded-lg hover:bg-accent transition-colors',
    buttonGhost: 'inline-flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors text-sm',

    // Badges
    badgeSafe: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-safe text-white',
    badgeRefusal: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-refusal text-white',
    badgeMuted: 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground',

    // Inputs
    input: 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-brand focus:outline-none',
    select: 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground appearance-none focus:ring-2 focus:ring-brand focus:outline-none',
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────

export const spacing = {
    cardPadding: 'p-6',
    sectionGap: 'space-y-6',
    itemGap: 'gap-4',
    pageWrapper: 'max-w-7xl mx-auto px-4 md:px-8 lg:px-12',
} as const;

// ─── Icon Sizes ─────────────────────────────────────────────────────────────

export const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
} as const;
