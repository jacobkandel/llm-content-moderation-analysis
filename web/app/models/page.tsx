import { getProviderName, getLogoUrl } from '@/lib/provider-logos';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export default async function ModelsIndex() {
    let models: any[] = [];
    try {
        const modelsPath = path.join(process.cwd(), 'public', 'models.json');
        models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
    } catch (e) {
        console.error("Failed to load models.json", e);
    }

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
                            key={model.id}
                            href={`/models/${model.id}`}
                            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover-lift transition-all group"
                        >
                            <div className="w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0">
                                <img
                                    src={getLogoUrl(model.id)}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="object-contain opacity-80"
                                />
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                                    {model.display_name}
                                </h2>
                                <p className="text-sm text-muted-foreground truncate">
                                    {getProviderName(model.id)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
