'use client';

import { useState } from 'react';
import { Copy, Check, BookOpen } from 'lucide-react';

const BIBTEX = `@misc{kandel2026moderationbias,
  title     = {Moderation Bias: A Systematic Benchmark of Content Moderation Across Large Language Models},
  author    = {Kandel, Jacob},
  year      = {2026},
  url       = {https://moderationbias.com},
  note      = {Open benchmark and dataset available at https://huggingface.co/datasets/jmk9494/moderation-bias-benchmark}
}`;

const APA = `Kandel, J. (2026). Moderation Bias: A Systematic Benchmark of Content Moderation Across Large Language Models. https://moderationbias.com`;

export function CiteButton() {
    const [copied, setCopied] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const copyText = (text: string, format: string) => {
        navigator.clipboard.writeText(text);
        setCopied(format);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label="Cite this research"
            >
                <BookOpen className="h-3.5 w-3.5" />
                Cite This
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-[420px] bg-popover border border-border rounded-xl shadow-xl p-4 space-y-3">
                        <h4 className="text-sm font-bold text-foreground">Cite This Research</h4>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">BibTeX</span>
                                <button
                                    onClick={() => copyText(BIBTEX, 'bibtex')}
                                    className="flex items-center gap-1 text-xs text-brand hover:underline"
                                >
                                    {copied === 'bibtex' ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                                </button>
                            </div>
                            <pre className="text-[11px] bg-muted/30 border border-border rounded-lg p-3 overflow-x-auto font-mono text-foreground leading-relaxed">{BIBTEX}</pre>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-muted-foreground">APA</span>
                                <button
                                    onClick={() => copyText(APA, 'apa')}
                                    className="flex items-center gap-1 text-xs text-brand hover:underline"
                                >
                                    {copied === 'apa' ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
                                </button>
                            </div>
                            <p className="text-xs bg-muted/30 border border-border rounded-lg p-3 text-foreground">{APA}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
