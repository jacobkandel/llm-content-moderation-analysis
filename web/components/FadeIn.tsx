'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
}

/**
 * Reads the user's reduced-motion preference via useSyncExternalStore so the
 * value stays in sync without calling setState synchronously inside an effect.
 * The server snapshot assumes motion is allowed to avoid hydration mismatches.
 */
function usePrefersReducedMotion() {
    return useSyncExternalStore(
        subscribeReducedMotion,
        () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
        () => false,
    );
}

/**
 * Wraps children in a fade-in + slide-up animation when scrolled into view.
 * 
 * Uses IntersectionObserver (works in all browsers) as the primary mechanism.
 * CSS `@starting-style` would be ideal for DOM-insertion animations, but
 * this component needs scroll-triggered reveal which IO handles perfectly.
 * 
 * Respects `prefers-reduced-motion` to disable movement for accessibility.
 */
export function FadeIn({ children, className = '', delay = 0, duration = 500 }: FadeInProps) {
    const [inView, setInView] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    useEffect(() => {
        // Reduced motion: reveal immediately, no observer needed.
        if (prefersReducedMotion) return;

        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Delay before triggering animation
                    if (delay > 0) {
                        setTimeout(() => setInView(true), delay);
                    } else {
                        setInView(true);
                    }
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [delay, prefersReducedMotion]);

    const visible = prefersReducedMotion || inView;

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(12px)',
                transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
            }}
        >
            {children}
        </div>
    );
}
