'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    delay?: number;
    formatValue?: (val: number) => string;
    className?: string;
}

export function AnimatedNumber({
    value,
    duration = 2,
    delay = 0,
    formatValue = (val) => Math.floor(val).toLocaleString(),
    className = ""
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (!isInView) return;

        let startTime: number | null = null;
        let animationFrameId: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // Wait for delay
            if (elapsed < delay * 1000) {
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            const activeElapsed = elapsed - (delay * 1000);
            const progress = Math.min(activeElapsed / (duration * 1000), 1);

            // Easing function: easeOutExpo
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            setDisplayValue(easeProgress * value);

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [value, duration, delay, isInView]);

    return (
        <span ref={ref} className={className}>
            {formatValue(displayValue)}
        </span>
    );
}
