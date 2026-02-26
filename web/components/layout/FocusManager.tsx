'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function FocusManager() {
    const pathname = usePathname();

    useEffect(() => {
        // Find the main H1 tag first
        const h1 = document.querySelector('h1');
        if (h1) {
            // Give h1 a temporary tabIndex if it doesn't have one to make it focusable
            const originalTabIndex = h1.getAttribute('tabindex');
            h1.setAttribute('tabindex', '-1');
            h1.focus({ preventScroll: true });
            h1.style.outline = 'none'; // Don't show a visible focus ring when programmatically focusing H1

            // Restore original tabIndex on blur
            h1.addEventListener('blur', function cleanup() {
                if (originalTabIndex) {
                    h1.setAttribute('tabindex', originalTabIndex);
                } else {
                    h1.removeAttribute('tabindex');
                }
                h1.style.outline = '';
                h1.removeEventListener('blur', cleanup);
            }, { once: true });

            return;
        }

        // Fallback to main-content
        const main = document.getElementById('main-content');
        if (main) {
            const originalTabIndex = main.getAttribute('tabindex');
            main.setAttribute('tabindex', '-1');
            main.focus({ preventScroll: true });
            main.style.outline = 'none';

            main.addEventListener('blur', function cleanup() {
                if (originalTabIndex) {
                    main.setAttribute('tabindex', originalTabIndex);
                } else {
                    main.removeAttribute('tabindex');
                }
                main.style.outline = '';
                main.removeEventListener('blur', cleanup);
            }, { once: true });
        }
    }, [pathname]);

    return null; // This component doesn't render anything visually
}
