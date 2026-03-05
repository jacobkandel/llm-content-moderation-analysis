import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function sanitizeSearchInput(input: string): string {
    if (!input) return '';
    // Strip common HTML/script injection characters to prevent XSS issues down the line
    return input.replace(/[<>'";]/g, '').trim();
}
