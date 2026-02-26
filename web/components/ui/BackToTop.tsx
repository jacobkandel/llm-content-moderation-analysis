'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 500) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    if (!isVisible) return null;

    return (
        <button
            onClick={scrollToTop}
            aria-label="Back to top"
            className="fixed bottom-8 right-8 p-3 rounded-full bg-[#800000] text-white shadow-lg shadow-black/20 z-50 hover:bg-[#800000]/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
        >
            <ArrowUp className="w-5 h-5" />
        </button>
    );
}
