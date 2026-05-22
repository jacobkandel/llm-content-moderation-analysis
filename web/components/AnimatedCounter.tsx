'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
    className?: string;
}

/**
 * Animated counter that counts up from 0 to the target value
 * when it scrolls into view. Uses IntersectionObserver for trigger.
 */
export function AnimatedCounter({
    value,
    duration = 1200,
    suffix = '',
    prefix = '',
    decimals = 0,
    className = '',
}: AnimatedCounterProps) {
    const [display, setDisplay] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!ref.current || hasAnimated) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    const start = performance.now();

                    const tick = (now: number) => {
                        const elapsed = now - start;
                        const progress = Math.min(elapsed / duration, 1);
                        // Ease-out cubic for natural deceleration
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setDisplay(eased * value);

                        if (progress < 1) {
                            requestAnimationFrame(tick);
                        } else {
                            setDisplay(value);
                        }
                    };

                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [value, duration, hasAnimated]);

    const formatted = decimals > 0
        ? display.toFixed(decimals)
        : Math.round(display).toLocaleString();

    return (
        <span ref={ref} className={className}>
            {prefix}{formatted}{suffix}
        </span>
    );
}
