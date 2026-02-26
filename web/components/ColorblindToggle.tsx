'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function ColorblindToggle() {
    const [isColorblind, setIsColorblind] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('colorblind-mode') === 'true';
        setIsColorblind(stored);
        if (stored) {
            document.documentElement.classList.add('colorblind');
        }
    }, []);

    const toggleColorblind = () => {
        const next = !isColorblind;
        setIsColorblind(next);
        localStorage.setItem('colorblind-mode', String(next));
        if (next) {
            document.documentElement.classList.add('colorblind');
        } else {
            document.documentElement.classList.remove('colorblind');
        }
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleColorblind}
            className={`p-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${isColorblind
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            title={isColorblind ? "Disable Colorblind Mode" : "Enable Colorblind Mode"}
        >
            {isColorblind ? (
                <EyeOff className="h-5 w-5" />
            ) : (
                <Eye className="h-5 w-5" />
            )}
            <span className="lg:hidden">Colorblind</span>
        </button>
    );
}
