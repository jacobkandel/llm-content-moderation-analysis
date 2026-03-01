import { Dispatch, SetStateAction } from 'react';
import { ChevronDown, ArrowLeftRight, Share2, Check } from 'lucide-react';

interface ModelSelectorProps {
    modelA: string;
    modelB: string;
    setModelA: Dispatch<SetStateAction<string>>;
    setModelB: Dispatch<SetStateAction<string>>;
    availableModels: string[];
    handleShare: () => void;
    copied: boolean;
}

export function ModelSelector({
    modelA,
    modelB,
    setModelA,
    setModelB,
    availableModels,
    handleShare,
    copied
}: ModelSelectorProps) {
    return (
        <>
            {/* Header */}
            <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                        Model Comparison
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base mt-1">
                        Side-by-side analysis of model behavior, refusal rates, and disagreements.
                    </p>
                </div>
                <button
                    onClick={handleShare}
                    title="Copy shareable link"
                    className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-muted/40 transition-all text-muted-foreground hover:text-foreground flex-shrink-0"
                    aria-label={copied ? 'Link copied!' : 'Copy comparison link to clipboard'}
                >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Share'}
                </button>
            </header>

            {/* Model Selectors */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-card p-4 rounded-xl border border-border">
                <div className="w-full md:w-1/2 relative">
                    <label htmlFor="model-a-select" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model A</label>
                    <select
                        id="model-a-select"
                        value={modelA}
                        onChange={(e) => setModelA(e.target.value)}
                        className="w-full relative z-10 appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-brand font-medium"
                    >
                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                </div>

                <button
                    onClick={() => {
                        const temp = modelA;
                        setModelA(modelB);
                        setModelB(temp);
                    }}
                    aria-label="Swap models"
                    title="Swap Model A and Model B"
                    className="flex items-center justify-center p-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors md:mt-5 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <ArrowLeftRight className="h-4 w-4" />
                </button>

                <div className="w-full md:w-1/2 relative">
                    <label htmlFor="model-b-select" className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model B</label>
                    <select
                        id="model-b-select"
                        value={modelB}
                        onChange={(e) => setModelB(e.target.value)}
                        className="w-full relative z-10 appearance-none bg-background border border-border text-foreground rounded-lg p-3 pr-8 focus:ring-2 focus:ring-brand font-medium"
                    >
                        {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                </div>
            </div>
        </>
    );
}
