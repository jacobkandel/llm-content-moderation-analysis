'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    LayoutDashboard,
    BarChart3,
    Settings,
    ArrowRight,
    Beaker,
    Shield,
    Cpu,
    Layers
} from 'lucide-react';
import { sanitizeSearchInput } from '@/lib/utils';

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon: React.ReactNode;
    action: () => void;
    keywords?: string[];
}

interface CommandPaletteProps {
    isCollapsed?: boolean;
}

export function CommandPalette({ isCollapsed = false }: CommandPaletteProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [modelsData, setModelsData] = useState<{ id: string, display_name: string, provider: string }[]>([]);
    const [promptsData, setPromptsData] = useState<{ id: string, text: string, category: string }[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Reset transient UI state and open the palette. Doing the resets here (in an
    // event-driven handler) rather than in an effect avoids cascading renders.
    const openPalette = useCallback(() => {
        setSearch('');
        setSelectedIndex(0);
        setIsOpen(true);
    }, []);

    useEffect(() => {
        fetch('/models.json')
            .then(res => res.json())
            .then(data => setModelsData(data))
            .catch(err => console.error('Failed to pre-fetch models for command palette', err));

        fetch('/prompts_list.json')
            .then(res => res.json())
            .then(data => setPromptsData(data))
            .catch(err => console.error('Failed to pre-fetch prompts for command palette', err));
    }, []);

    const hardcodedCategories = [
        'crime', 'cybersecurity', 'dangerous', 'deception', 'explicit-sexual',
        'false-positive-control', 'harassment', 'hate-speech', 'health-misinformation',
        'incitement-to-violence', 'paternalism', 'political', 'self-harm', 'weapons'
    ];

    const staticCommands: CommandItem[] = [
        // Compare
        {
            id: 'compare',
            title: 'Compare Models',
            description: 'Side-by-side model comparison',
            icon: <Beaker className="h-4 w-4" />,
            action: () => router.push('/compare'),
            keywords: ['diff', 'versus', 'vs']
        },
        // Reliability
        {
            id: 'reliability',
            title: 'Reliability Analysis',
            description: "Fleiss' Kappa and internal consistency scores",
            icon: <Shield className="h-4 w-4" />,
            action: () => router.push('/analysis/reliability'),
            keywords: ['reliability', 'kappa', 'consistency', 'stability']
        },
        {
            id: 'drift',
            title: 'Model Stability',
            description: 'Longitudinal stability tracking over time',
            icon: <Settings className="h-4 w-4" />,
            action: () => router.push('/analysis/drift'),
            keywords: ['drift', 'change', 'history', 'time', 'longitudinal']
        },
        {
            id: 'significance',
            title: 'Statistical Significance',
            description: "McNemar's test and p-values",
            icon: <BarChart3 className="h-4 w-4" />,
            action: () => router.push('/analysis/significance'),
            keywords: ['stats', 'p-value', 'significance', 'math']
        },
        // Bias
        {
            id: 'political',
            title: 'Political Compass',
            description: 'Analyze political leanings of models',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => router.push('/analysis/political'),
            keywords: ['politics', 'bias', 'left', 'right', 'compass']
        },
        {
            id: 'paternalism',
            title: 'Paternalism Audit',
            description: 'Refusal differentials across user personas',
            icon: <Shield className="h-4 w-4" />,
            action: () => router.push('/analysis/paternalism'),
            keywords: ['paternalism', 'persona', 'discrimination', 'bias']
        },
        // Technical
        {
            id: 'clusters',
            title: 'Semantic Clusters',
            description: 'Topic modeling of refused prompts',
            icon: <BarChart3 className="h-4 w-4" />,
            action: () => router.push('/analysis/clusters'),
            keywords: ['topics', 'clusters', 'semantic', 'grouping']
        },
        {
            id: 'consensus',
            title: 'Council Consensus',
            description: 'Multi-model agreement analysis',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => router.push('/analysis/consensus'),
            keywords: ['council', 'agreement', 'consensus', 'jury']
        },
    ];

    const modelCommands: CommandItem[] = modelsData.map(m => ({
        id: `model-${m.id}`,
        title: m.display_name,
        description: `View model profile (${m.provider})`,
        icon: <Cpu className="h-4 w-4" />,
        action: () => router.push(`/models/${m.id}`),
        keywords: ['model', 'llm', m.provider, m.display_name, m.id]
    }));

    const categoryCommands: CommandItem[] = hardcodedCategories.map(cat => ({
        id: `cat-${cat}`,
        title: cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `View category behavior`,
        icon: <Layers className="h-4 w-4" />,
        action: () => router.push(`/categories/${cat}`),
        keywords: ['category', 'topic', 'policy', cat]
    }));

    const promptCommands: CommandItem[] = promptsData.map(p => ({
        id: `prompt-${p.id}`,
        title: p.text,
        description: `Prompt in ${p.category}`,
        icon: <Search className="h-4 w-4" />,
        action: () => router.push(`/compare?q=${encodeURIComponent(p.text)}`),
        keywords: ['prompt', 'query', p.category, ...p.text.split(' ')]
    }));

    const allCommands = [...staticCommands, ...modelCommands, ...categoryCommands, ...promptCommands];

    const filteredCommands = allCommands.filter(cmd => {
        const searchLower = sanitizeSearchInput(search).toLowerCase();
        return (
            cmd.title.toLowerCase().includes(searchLower) ||
            cmd.description?.toLowerCase().includes(searchLower) ||
            cmd.keywords?.some(k => k.includes(searchLower))
        );
    });

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openPalette();
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [openPalette]);

    // Focus input when opened (DOM side effect only)
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            e.preventDefault();
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
        }
    }, [filteredCommands, selectedIndex]);

    return (
        <>
            {/* Trigger hint - shown in sidebar */}
            {isCollapsed ? (
                <button
                    onClick={openPalette}
                    className="w-full flex justify-center p-2 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                    title="Search (Cmd+K)"
                >
                    <Search className="h-5 w-5" />
                </button>
            ) : (
                <button
                    onClick={openPalette}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-accent/50 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    <Search className="h-4 w-4" />
                    <span className="flex-1 text-left">Search...</span>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background rounded border border-border text-muted-foreground">
                        ⌘K
                    </kbd>
                </button>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                        />

                        {/* Palette */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.15 }}
                            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
                        >
                            <div className="bg-card rounded-xl shadow-2xl border border-border overflow-hidden">
                                {/* Search Input */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                    <Search className="h-5 w-5 text-muted-foreground/70" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Search commands..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setSelectedIndex(0);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base"
                                    />
                                    <kbd className="px-2 py-1 text-xs font-mono text-muted-foreground/70 bg-muted rounded">
                                        ESC
                                    </kbd>
                                </div>

                                {/* Commands List */}
                                <div className="max-h-[300px] overflow-y-auto py-2">
                                    {filteredCommands.length === 0 ? (
                                        <div className="px-4 py-8 text-center text-muted-foreground">
                                            No commands found
                                        </div>
                                    ) : (
                                        filteredCommands.map((cmd, index) => (
                                            <button
                                                key={cmd.id}
                                                onClick={() => {
                                                    cmd.action();
                                                    setIsOpen(false);
                                                }}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                                    ? 'bg-muted'
                                                    : 'hover:bg-muted/50'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${index === selectedIndex
                                                    ? 'bg-background text-primary'
                                                    : 'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-foreground">
                                                        {cmd.title}
                                                    </div>
                                                    {cmd.description && (
                                                        <div className="text-sm text-muted-foreground truncate">
                                                            {cmd.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <ArrowRight className={`h-4 w-4 ${index === selectedIndex ? 'text-primary' : 'text-muted-foreground'
                                                    }`} />
                                            </button>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground/70">
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
                                        navigate
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                                        select
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
