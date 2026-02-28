'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Box } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { getLogoUrl, getProviderName } from '@/lib/provider-logos';
import { sanitizeSearchInput } from '@/lib/utils';

interface ModelInfo {
    id: string;
    name: string;
    lastTested: string;
    totalEvaluations: number;
}

interface ModelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    models: ModelInfo[];
}

export default function ModelsModal({ isOpen, onClose, models }: ModelsModalProps) {
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const parentRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // Filter models based on search
    const filteredModels = useMemo(() => {
        if (!debouncedSearch) return models;
        const lowerSearch = sanitizeSearchInput(debouncedSearch).toLowerCase();
        return models.filter(m =>
            m.name.toLowerCase().includes(lowerSearch)
        );
    }, [models, debouncedSearch]);

    // Virtualizer for performance
    const rowVirtualizer = useVirtualizer({
        count: filteredModels.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 80,
        overscan: 5,
    });

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none"
                    >
                        <div className="bg-background w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl border border-border flex flex-col pointer-events-auto">
                            {/* Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        Models Tested
                                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                            {filteredModels.length}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Overview of all AI models evaluated
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4 border-b border-border">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search models..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div
                                ref={parentRef}
                                className="flex-1 overflow-y-auto p-4 min-h-[400px]"
                            >
                                <div
                                    style={{
                                        height: `${rowVirtualizer.getTotalSize()}px`,
                                        width: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const model = filteredModels[virtualRow.index];
                                        return (
                                            <div
                                                key={model.id}
                                                data-index={virtualRow.index}
                                                ref={rowVirtualizer.measureElement}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                                className="pb-3"
                                            >
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        router.push(`/models/${model.id}`);
                                                    }}
                                                    className="w-full text-left p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors group flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center border border-border overflow-hidden shrink-0">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={getLogoUrl(model.name)}
                                                                alt={getProviderName(model.name)}
                                                                width={28}
                                                                height={28}
                                                                className="object-contain"
                                                                onError={(e) => {
                                                                    // Fallback to text or icon if needed, but standard onError to hide is usually safe or swap src
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.parentElement?.classList.add('bg-primary/10');
                                                                    e.currentTarget.parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box w-5 h-5 text-primary"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>';
                                                                }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground">
                                                                {model.name}
                                                            </h3>
                                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                                {getProviderName(model.name)} • {model.totalEvaluations.toLocaleString()} evaluations
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>
                                                            {model.lastTested}
                                                        </span>
                                                    </div>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                {filteredModels.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Search className="w-8 h-8 mb-2 opacity-20" />
                                        <p>No models found matching "{search}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
