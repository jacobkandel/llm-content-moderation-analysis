/**
 * Prompt source classification based on prompt ID patterns.
 *
 * Identifies whether a prompt is hand-written, template-generated,
 * a style variant, a boundary test, or a false positive control.
 */

const STYLE_SUFFIXES = ['-DIRECT', '-ROLEPLAY', '-ACADEMIC', '-CASUAL', '-ORGANIC'];

/**
 * Determine the source/type of a prompt from its ID.
 */
export function getPromptSource(id: string | undefined): string {
  if (!id) return 'Unknown';

  const upper = id.toUpperCase();

  // Style variants: GEN-XXX-STYLE
  if (upper.startsWith('GEN-') && STYLE_SUFFIXES.some(s => upper.includes(s))) {
    return 'Style Variant';
  }

  // Template-generated: GEN-XXX (no style suffix)
  if (upper.startsWith('GEN-')) {
    return 'Template-Generated';
  }

  // Boundary tests: B-XXX
  if (upper.startsWith('B-')) {
    return 'Boundary Test';
  }

  // False positive controls: FPC-XXX
  if (upper.startsWith('FPC-')) {
    return 'False Positive Control';
  }

  // Everything else is hand-written
  return 'Hand-Written';
}

/**
 * Get a Tailwind badge class for a prompt source type.
 */
export function getSourceBadgeClass(source: string): string {
  switch (source) {
    case 'Hand-Written':
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    case 'Template-Generated':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'Style Variant':
      return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
    case 'Boundary Test':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800';
    case 'False Positive Control':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
