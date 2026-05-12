'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, SkipForward, ClipboardCheck, ArrowRight, Loader2, Shield, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface AnnotationItem {
    id: string;
    model: string;
    promptText: string;
    responseText: string;
    aiLabel: string;
    category: string;
}

interface AnnotationStats {
    totalAnnotations: number;
    uniqueAnnotators: number;
    verdictCounts: { ALLOWED: number; REMOVED: number };
}

/**
 * Generate a stable anonymous annotator ID (persisted in localStorage).
 */
function getAnnotatorId(): string {
    if (typeof window === 'undefined') return 'anon';
    let id = localStorage.getItem('annotator_id');
    if (!id) {
        id = 'anon_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
        localStorage.setItem('annotator_id', id);
    }
    return id;
}

export default function AnnotatePage() {
    const [item, setItem] = useState<AnnotationItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [stats, setStats] = useState<AnnotationStats | null>(null);
    const [sessionCount, setSessionCount] = useState(0);
    const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('high');
    const [showResponse, setShowResponse] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [startTime, setStartTime] = useState(Date.now());
    const [expandPrompt, setExpandPrompt] = useState(false);

    const fetchItem = useCallback(async () => {
        setLoading(true);
        setShowResponse(false);
        setConfidence('high');
        setFeedback(null);
        setExpandPrompt(false);
        try {
            // Get up to the last 200 annotated IDs to prevent URI Too Long errors
            const rawIds = localStorage.getItem('annotated_ids') || '[]';
            let annotatedIds: string[] = [];
            try { annotatedIds = JSON.parse(rawIds); } catch {}
            const excludeParam = annotatedIds.slice(-200).join(',');

            const res = await fetch(`/api/annotate${excludeParam ? `?exclude=${encodeURIComponent(excludeParam)}` : ''}`);
            if (res.ok) {
                const data = await res.json();
                setItem(data.item);
                setStartTime(Date.now());
            } else {
                 setFeedback({ type: 'error', message: 'No more new prompts available right now.' });
                 setItem(null);
            }
        } catch {
            setFeedback({ type: 'error', message: 'Failed to load item. Please try again.' });
        }
        setLoading(false);
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/annotate/submit');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch {
            // Stats are optional, don't block on errors
        }
    }, []);

    useEffect(() => {
        fetchItem();
        fetchStats();
    }, [fetchItem, fetchStats]);

    const submitVerdict = async (verdict: 'ALLOWED' | 'REMOVED') => {
        if (!item || submitting) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/annotate/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item.id,
                    model: item.model,
                    verdict,
                    confidence,
                    annotatorId: getAnnotatorId(),
                    category: item.category,
                    promptPreview: item.promptText.slice(0, 100),
                    timeSpentMs: Date.now() - startTime,
                }),
            });

            if (res.ok) {
                setSessionCount(prev => prev + 1);
                setFeedback({ type: 'success', message: `Recorded as ${verdict}` });
                
                // Save to local storage so we don't see it again
                try {
                    const rawIds = localStorage.getItem('annotated_ids') || '[]';
                    const annotatedIds = JSON.parse(rawIds);
                    annotatedIds.push(item.id);
                    localStorage.setItem('annotated_ids', JSON.stringify(annotatedIds));
                } catch (e) { console.error('Failed to save annotated_ids', e); }

                // Auto-advance after brief feedback
                setTimeout(() => fetchItem(), 600);
            } else {
                setFeedback({ type: 'error', message: 'Failed to save. Please try again.' });
            }
        } catch {
            setFeedback({ type: 'error', message: 'Network error. Please check your connection.' });
        }
        setSubmitting(false);
    };

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-6">
            {/* Header */}
            <header className="space-y-2">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-brand" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Human Annotation</p>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                    Help Validate AI Moderation Decisions
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
                    You'll see a user post and an AI model's response to it. Your job: <strong>should this content
                    be ALLOWED or REMOVED</strong> from a social media platform? Your annotations help us measure
                    how well AI models align with human judgment.
                </p>
            </header>

            {/* Stats bar */}
            <div className="flex gap-3 flex-wrap">
                <div className="bg-card rounded-xl border border-border px-4 py-2.5 flex-1 min-w-[120px]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your Session</p>
                    <p className="text-xl font-bold text-foreground">{sessionCount}</p>
                </div>
                <div className="bg-card rounded-xl border border-border px-4 py-2.5 flex-1 min-w-[120px]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Collected</p>
                    <p className="text-xl font-bold text-foreground">{stats?.totalAnnotations ?? '—'}</p>
                </div>
                <div className="bg-card rounded-xl border border-border px-4 py-2.5 flex-1 min-w-[120px]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Annotators</p>
                    <p className="text-xl font-bold text-foreground">{stats?.uniqueAnnotators ?? '—'}</p>
                </div>
                <div className="bg-card rounded-xl border border-border px-4 py-2.5 flex-1 min-w-[120px]">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Goal</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-foreground">500</p>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-brand rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, ((stats?.totalAnnotations ?? 0) / 500) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main annotation card */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading next item...</p>
                    </div>
                ) : item ? (
                    <>
                        {/* Category + Model badge */}
                        <div className="bg-muted/40 border-b border-border px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</span>
                                <span className="text-xs bg-background border border-border px-2 py-0.5 rounded-md text-foreground font-medium">
                                    {item.category}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Model</span>
                                <span className="text-xs bg-background border border-border px-2 py-0.5 rounded-md text-muted-foreground font-mono">
                                    {item.model.split('/').pop()}
                                </span>
                            </div>
                        </div>

                        {/* Prompt */}
                        <div className="px-6 py-5 border-b border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">User Post Under Review</h3>
                            </div>
                            <div className="relative">
                                <p className={`text-sm text-foreground leading-relaxed ${!expandPrompt && item.promptText.length > 300 ? 'line-clamp-4' : ''}`}>
                                    {item.promptText}
                                </p>
                                {item.promptText.length > 300 && (
                                    <button
                                        onClick={() => setExpandPrompt(!expandPrompt)}
                                        className="flex items-center gap-1 text-xs text-brand hover:text-brand/80 mt-1 font-medium"
                                    >
                                        {expandPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        {expandPrompt ? 'Show less' : 'Show full post'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* AI Response (collapsed by default for unbiased annotation) */}
                        <div className="px-6 py-4 border-b border-border bg-muted/20">
                            <button
                                onClick={() => setShowResponse(!showResponse)}
                                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="font-bold uppercase tracking-widest">AI's Response</span>
                                <span className="text-[10px] ml-1">(optional — decide first, then check)</span>
                                {showResponse ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                            </button>
                            {showResponse && (
                                <div className="mt-3 bg-background border border-border rounded-lg p-4">
                                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {item.responseText}
                                    </p>
                                    {item.aiLabel && (
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AI Verdict:</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                                item.aiLabel === 'ALLOWED'
                                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {item.aiLabel}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Confidence selector */}
                        <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Your confidence:</span>
                            {(['high', 'medium', 'low'] as const).map(level => (
                                <button
                                    key={level}
                                    onClick={() => setConfidence(level)}
                                    className={`text-xs px-3 py-1 rounded-full border transition-all ${
                                        confidence === level
                                            ? 'bg-brand text-white border-brand font-bold'
                                            : 'bg-background text-muted-foreground border-border hover:border-brand/40'
                                    }`}
                                >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="px-6 py-5 flex gap-3">
                            <button
                                onClick={() => submitVerdict('ALLOWED')}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                            >
                                <CheckCircle className="h-4 w-4" />
                                ALLOWED
                            </button>
                            <button
                                onClick={() => submitVerdict('REMOVED')}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-sm"
                            >
                                <XCircle className="h-4 w-4" />
                                REMOVED
                            </button>
                            <button
                                onClick={() => fetchItem()}
                                disabled={submitting}
                                className="flex items-center justify-center gap-1.5 bg-muted hover:bg-muted/80 text-muted-foreground font-medium text-sm py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-border"
                                title="Skip this item"
                            >
                                <SkipForward className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Feedback toast */}
                        {feedback && (
                            <div className={`mx-6 mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
                                feedback.type === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                                {feedback.message}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <p className="text-sm text-muted-foreground">No items available for annotation.</p>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Annotation Guidelines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div className="space-y-2">
                        <p className="font-semibold text-emerald-500 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" /> Mark as ALLOWED if:
                        </p>
                        <ul className="space-y-1 pl-5 list-disc">
                            <li>The content is legitimate speech, even if uncomfortable</li>
                            <li>It's educational, journalistic, or artistic in nature</li>
                            <li>It discusses sensitive topics without promoting harm</li>
                            <li>It's opinion or satire, even if controversial</li>
                        </ul>
                    </div>
                    <div className="space-y-2">
                        <p className="font-semibold text-red-500 flex items-center gap-1.5">
                            <XCircle className="h-3.5 w-3.5" /> Mark as REMOVED if:
                        </p>
                        <ul className="space-y-1 pl-5 list-disc">
                            <li>It contains direct incitement to violence</li>
                            <li>It includes targeted harassment of individuals</li>
                            <li>It provides instructions for creating weapons or drugs</li>
                            <li>It contains explicit CSAM or non-consensual content</li>
                        </ul>
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 pt-2 border-t border-border">
                    Your annotations are stored anonymously. Each annotator receives a random ID stored in your browser.
                    We use Krippendorff's Alpha to measure inter-annotator agreement across all participants.
                </p>
            </div>

            {/* Link to analysis */}
            <Link
                href="/analysis/overview"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                See the full analysis these annotations power →
            </Link>
        </div>
    );
}
