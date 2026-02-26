'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Check } from 'lucide-react';
import { usePathname } from 'next/navigation';

const TOUR_STEPS = [
    {
        title: "Welcome to Moderation Bias",
        content: "This tool tracks the hidden censorship rules of major AI models. We send thousands of controversial prompts and monitor what gets blocked.",
        position: { bottom: '20px', left: '20px' } // Bottom left general intro
    },
    {
        title: "Explore the Heatmap",
        content: "The dashboard shows which categories models restrict the most. Click any category to go deep into the data.",
        position: { top: '80px', left: '240px' } // Near sidebar/main content interaction
    },
    {
        title: "Compare Models head-to-head",
        content: "Want to see how GPT-4o stacks up against Claude 3.5? Use the Compare tool to see exactly where their safety boundaries differ.",
        position: { top: '150px', left: '80px' } // Pointing roughly toward compare in nav
    }
];

export function OnboardingTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const pathname = usePathname();

    useEffect(() => {
        // Only show on home page for the very first time
        if (pathname !== '/') return;

        const hasSeenTour = localStorage.getItem('has_seen_onboarding_tour');
        if (!hasSeenTour) {
            // Slight delay so the page loads first
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem('has_seen_onboarding_tour', 'true');
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="fixed z-[100] w-80 bg-primary text-primary-foreground shadow-2xl rounded-2xl overflow-hidden border border-primary/20"
                style={{
                    ...(step.position.top && { top: step.position.top }),
                    ...(step.position.bottom && { bottom: step.position.bottom }),
                    ...(step.position.left && { left: step.position.left }),
                    ...(step.position.right && { right: step.position.right }),
                }}
            >
                {/* Pointer Arrow (simplified, dynamic positioning is complex, assuming generic placement) */}

                <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70 bg-primary-foreground/10 px-2 py-0.5 rounded-sm">
                            Step {currentStep + 1} of {TOUR_STEPS.length}
                        </span>
                        <button
                            onClick={handleComplete}
                            className="text-primary-foreground/50 hover:text-primary-foreground transition-colors p-1 -mr-2 -mt-2 rounded-full hover:bg-primary-foreground/10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <h3 className="font-bold text-lg leading-tight mb-2 text-white">
                        {step.title}
                    </h3>

                    <p className="text-sm text-primary-foreground/90 leading-relaxed mb-6">
                        {step.content}
                    </p>

                    <div className="flex justify-between items-center">
                        <div className="flex gap-1.5">
                            {TOUR_STEPS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-4 bg-white' : 'w-1.5 bg-white/30'}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={handleNext}
                            className="bg-white text-primary text-sm font-bold px-4 py-2 rounded-full hover:bg-white/90 transition-colors flex items-center gap-1 shadow-sm"
                        >
                            {currentStep === TOUR_STEPS.length - 1 ? (
                                <>Get Started <Check className="w-4 h-4" /></>
                            ) : (
                                <>Next <ChevronRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
