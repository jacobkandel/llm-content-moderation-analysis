'use client';

import { useEffect, useRef, useState } from 'react';

interface FadeInProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
}

/**
 * Wraps children in a fade-in + slide-up animation on mount.
 * Uses CSS transitions for smooth 60fps performance.
 */
export function FadeIn({ children, className = '', delay = 0, duration = 500 }: FadeInProps) {
    const [visible, setVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}
