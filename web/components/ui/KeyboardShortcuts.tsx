'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';

export function KeyboardShortcuts() {
    const [isOpen, setIsOpen] = useState(false);
    // Kept mounted while the exit animation plays; unmounted in handleAnimationEnd.
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active element is an input or textarea
            if (
                ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName) ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            // Ignore if modifier keys are pressed (except shift for '?')
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            switch (e.key.toLowerCase()) {
                case '?':
                    e.preventDefault();
                    if (isOpen) {
                        setIsOpen(false);
                    } else {
                        // Mount before opening so the enter animation plays.
                        setMounted(true);
                        setIsOpen(true);
                    }
                    break;
                case 'c':
                    e.preventDefault();
                    router.push('/compare');
                    break;
                case 'a':
                    e.preventDefault();
                    router.push('/analysis/summary');
                    break;
                case 's':
                    e.preventDefault();
                    router.push('/analysis/significance');
                    break;
                case 'escape':
                    if (isOpen) {
                        e.preventDefault();
                        setIsOpen(false);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router, isOpen]);

    const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
        // Only the backdrop's own exit animation (not the modal's, which bubbles
        // up) should unmount the overlay, and only when it's actually closing.
        if (e.target === e.currentTarget && !isOpen) {
            setMounted(false);
        }
    };

    if (!mounted) return null;

    return (
        // Backdrop
        <div
            onAnimationEnd={handleAnimationEnd}
            onClick={() => setIsOpen(false)}
            className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${isOpen ? 'animate-overlay-in' : 'animate-overlay-out'}`}
        >
            {/* Modal (animation on the wrapper so the inner .bg-card box keeps its own styling) */}
            <div
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-md ${isOpen ? 'animate-modal-in' : 'animate-modal-out'}`}
            >
                <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <Keyboard className="w-5 h-5 text-muted-foreground" />
                            Keyboard Shortcuts
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 space-y-3">
                        <ShortcutRow kbd="?" label="Show this help menu" />
                        <ShortcutRow kbd="⌘ + K" label="Open global search" />
                        <div className="h-px bg-border my-2" />
                        <ShortcutRow kbd="C" label="Go to Compare Models" />
                        <ShortcutRow kbd="A" label="Go to Analysis Summary" />
                        <ShortcutRow kbd="S" label="Go to Significance Analysis" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShortcutRow({ kbd, label }: { kbd: string, label: string }) {
    return (
        <div className="flex items-center justify-between text-sm text-foreground py-1">
            <span>{label}</span>
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-xs text-muted-foreground font-semibold">
                {kbd}
            </kbd>
        </div>
    );
}
