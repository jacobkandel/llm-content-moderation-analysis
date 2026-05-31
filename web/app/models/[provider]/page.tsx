import type { Metadata } from 'next';
import { getProviderName, getLogoUrl } from '@/lib/provider-logos';
import Link from 'next/link';
import Image from 'next/image';
import modelsData from '@/public/models.json';

export async function generateMetadata({ params }: { params: Promise<{ provider: string }> }): Promise<Metadata> {
  const { provider } = await params;
  const name = getProviderName(provider);
  return {
    title: `${name} Models — ModerationBias`,
    description: `All ${name} models benchmarked in Moderation Bias. Compare refusal rates, verbosity, and category-level censorship data.`,
    alternates: { canonical: `/models/${provider}` },
    openGraph: { title: `${name} Models — ModerationBias`, url: `/models/${provider}` },
  };
}

type ModelInfo = {
  id: string;
  name: string;
  display_name: string;
  provider: string;
  tier: string;
  cost_per_m_in: number;
  cost_per_m_out: number;
};

export default async function ProviderModels({ params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  let models: ModelInfo[] = [];
  try {
    // Filter by the first segment of the model ID (e.g. "openai" from "openai/gpt-4o"),
    // not by m.provider which is a display name like "OpenAI".
    models = (modelsData as ModelInfo[]).filter(
      m => m.id.split('/')[0].toLowerCase() === provider.toLowerCase()
    );
  } catch (e) {
    console.error('Failed to load models.json', e);
  }

  return (
    <main className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4 text-foreground">{getProviderName(provider)}</h1>
          <p className="text-xl text-muted-foreground">Models provided by {getProviderName(provider)}.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map(model => (
            <Link
              key={model.id}
              href={`/models/${model.id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover-lift transition-all group"
            >
              <div className="w-12 h-12 rounded-lg border border-border bg-muted/30 flex items-center justify-center shrink-0">
                <Image
                  src={getLogoUrl(model.id)}
                  alt={`${model.display_name} logo`}
                  width={24}
                  height={24}
                  className="object-contain opacity-80"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                  {model.display_name}
                </h2>
                <p className="text-sm text-muted-foreground truncate">{model.tier}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
