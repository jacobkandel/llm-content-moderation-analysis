'use client';

import { useEffect, useRef, useState } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
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
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Check reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Delay before triggering animation
                    if (delay > 0) {
                        setTimeout(() => setVisible(true), delay);
                    } else {
                        setVisible(true);
                    }
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

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
