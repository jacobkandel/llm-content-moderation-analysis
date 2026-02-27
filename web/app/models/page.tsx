import { getProviderName, getLogoUrl } from '@/lib/provider-logos';
import Link from 'next/link';

// Simple list of models currently in the dataset
const models = [
    'anthropic/claude-3-haiku',
    'anthropic/claude-3-opus',
    'anthropic/claude-3.5-sonnet',
    'cohere/command-r-plus-08-2024',
    'cohere/command-r-v01',
    'google/gemma-2-27b-it',
    'google/gemini-flash-1.5',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.1-405b-instruct',
    'meta-llama/llama-3.1-70b-instruct',
    'meta-llama/llama-3.1-8b-instruct',
    'meta-llama/llama-3.2-3b-instruct',
    'meta-llama/llama-3.2-90b-vision-instruct',
    'mistralai/mistral-large',
    'mistralai/mistral-small',
    'mistralai/mixtral-8x22b-instruct',
    'mistralai/mixtral-8x7b-instruct',
    'openai/gpt-4-turbo',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'qwen/qwen-2.5-72b-instruct'
];

export default function ModelsIndex() {
    return (
        <main className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-4xl font-bold mb-4 text-foreground">AI Models</h1>
                    <p className="text-xl text-muted-foreground">
                        Browse the LLMs included in our censorship and moderation analysis. Select a model to view its dedicated restrictiveness profile.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models.map(model => (
                        <Link
                            key={model}
                            href={`/models/${model}`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover-lift transition-all group"
                        >
                            <div className="w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0">
                                <img
                                    src={getLogoUrl(model)}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="object-contain opacity-80"
                                />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                                    {model.split('/').pop()}
                                </h2>
                                <p className="text-sm text-muted-foreground truncate">
                                    {getProviderName(model)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
