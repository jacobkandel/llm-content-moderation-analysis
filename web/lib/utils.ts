import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditionally join classNames together and merge Tailwind classes.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize user search input by removing dangerous characters.
 * Strips HTML tags, quotes, and semicolons to prevent XSS and injection.
 */
export function sanitizeSearchInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>'"`;]/g, '')
    .trim();
}
