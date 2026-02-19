/**
 * Determines the source type of a prompt based on its prompt ID pattern.
 * Shared across all pages that display prompt information.
 */
export function getPromptSource(promptId: string | undefined): string {
    if (!promptId) return 'Unknown';
    const pid = promptId.toUpperCase();
    if (pid.startsWith('GEN-')) {
        for (const suffix of ['-DIRECT', '-ROLEPLAY', '-ACADEMIC', '-CASUAL']) {
            if (pid.endsWith(suffix)) return 'Style Variant';
        }
        return 'Template-Generated';
    }
    if (pid.startsWith('B-')) return 'Boundary Test';
    if (pid.startsWith('FPC-')) return 'False Positive Control';
    return 'Hand-Written';
}

/**
 * Returns a Tailwind className string for styling the source badge.
 */
export function getSourceBadgeClass(source: string): string {
    switch (source) {
        case 'Hand-Written':
            return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'Template-Generated':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
        case 'Style Variant':
            return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        case 'Boundary Test':
            return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
        case 'False Positive Control':
            return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
}
