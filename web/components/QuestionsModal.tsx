'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Copy, Check } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Question {
    id: string;
    text: string;
    category: string;
}

interface QuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    questions: Question[];
}

export default function QuestionsModal({ isOpen, onClose, questions }: QuestionsModalProps) {
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    // Filter questions based on search
    const filteredQuestions = useMemo(() => {
        if (!search) return questions;
        const lowerSearch = search.toLowerCase();
        return questions.filter(q =>
            q.text.toLowerCase().includes(lowerSearch) ||
            q.category.toLowerCase().includes(lowerSearch)
        );
    }, [questions, search]);

    // Virtualizer for performance
    const rowVirtualizer = useVirtualizer({
        count: filteredQuestions.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100, // Estimate row height
        overscan: 5,
    });

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

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
                        <div className="bg-background w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl border border-border flex flex-col pointer-events-auto">
                            {/* Header */}
                            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        Test Cases
                                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                                            {filteredQuestions.length}
                                        </span>
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Browse all safety evaluation prompts
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
                                        placeholder="Search prompts or categories..."
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
                                        const question = filteredQuestions[virtualRow.index];
                                        return (
                                            <div
                                                key={question.id}
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
                                                <div className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                                                    {question.category}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground font-mono">
                                                                    ID: {question.id}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                                                {question.text}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleCopy(question.text, question.id)}
                                                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                                                            title="Copy prompt"
                                                        >
                                                            {copiedId === question.id ? (
                                                                <Check className="w-4 h-4 text-green-500" />
                                                            ) : (
                                                                <Copy className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {filteredQuestions.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Search className="w-8 h-8 mb-2 opacity-20" />
                                        <p>No questions found matching "{search}"</p>
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
