import Link from 'next/link';
import { ArrowRight, BarChart2, Zap, RefreshCw, ChevronRight } from 'lucide-react';
import fs from 'fs';
import path from 'path';

export default async function HomePage() {
  let modelsData: { id: string; display_name: string; provider: string }[] = [];
  try {
    const modelsPath = path.join(process.cwd(), 'public', 'models.json');
    modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
  } catch (error) {
    console.error('Failed to load models for homepage:', error);
  }

  const hardcodedCategories = [
    'crime', 'cybersecurity', 'dangerous', 'deception', 'explicit-sexual',
    'false-positive-control', 'harassment', 'hate-speech', 'health-misinformation',
    'incitement-to-violence', 'paternalism', 'political', 'self-harm', 'weapons'
  ];

  return (
    <main className="flex flex-col">
      {/* ── Hero ── */}
      <section className="relative bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
        {/* Maroon accent strip */}
        <div className="h-1.5 w-full bg-brand" aria-hidden />

        <div className="px-4 md:px-8 lg:px-16 py-12 md:py-24">
          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-6">
            Open-Source AI Research
          </p>

          {/* Headline — left-aligned, editorial */}
          <h1 className="text-3xl sm:text-4xl md:text-[3.75rem] font-black leading-[1.1] tracking-tight text-foreground mb-6 max-w-3xl">
            See How AI Models Differ in{' '}
            <span className="text-brand">Censorship and Bias</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            We run identical prompts through every major LLM and measure exactly which models
            refuse — and which ones don't.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <Link
              href="/compare"
              className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 bg-brand text-white font-bold text-sm px-7 py-3.5 rounded-lg shadow-sm hover:bg-brand/80 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Compare Models
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/about"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium transition-colors sm:mt-0.5 py-3.5"
            >
              More about the project <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>


      {/* ── Feature Stats ── */}
      <section className="bg-background border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {([
              { icon: BarChart2, value: '20+', label: 'Models Audited', desc: 'GPT-4, Claude, Llama, Gemini, and more' },
              { icon: Zap, value: '200', label: 'Prompts Tested', desc: 'Grounded in Wikipedia\'s controversial issues list' },
              { icon: RefreshCw, value: 'Bi-weekly', label: 'Auto-Updates', desc: 'Scheduled GitHub Actions keep data fresh' },
            ] as const).map(({ icon: Icon, value, label, desc }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card hover:border-brand/30 hover:shadow-md transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-brand" />
                </div>
                <div className="text-3xl font-black text-foreground mb-1">{value}</div>
                <div className="text-sm font-bold text-foreground mb-1">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl md:text-3xl font-black text-center text-foreground mb-3">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            A transparent, reproducible pipeline from prompt to insight.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {([
              {
                step: '01',
                title: 'Curate Prompts',
                body: 'We select 200 sensitive-but-legitimate questions spanning politics, health, law, and culture — sourced from Wikipedia\'s list of controversial topics.',
              },
              {
                step: '02',
                title: 'Run Every Model',
                body: 'The same system prompt hits every LLM via unified API calls. Responses are scored ALLOWED or REMOVED by an independent judge model.',
              },
              {
                step: '03',
                title: 'Visualise the Gap',
                body: 'Statistical tests (McNemar\'s) confirm whether differences are real. Browse radar charts, heatmaps, and side-by-side disagreement logs.',
              },
            ] as const).map(({ step, title, body }) => (
              <div
                key={step}
                className="relative bg-card border border-border rounded-2xl p-6 hover:border-brand/30 hover:shadow-md transition-all"
              >
                <div className="text-5xl font-black text-brand/10 absolute top-4 right-5 select-none">
                  {step}
                </div>
                <div className="h-8 w-8 rounded-lg bg-brand text-white text-sm font-bold flex items-center justify-center mb-4">
                  {step}
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-4">
            Ready to explore the data?
          </h2>
          <p className="text-muted-foreground mb-8">
            Pick any two LLMs and instantly compare their censorship profiles, refusal rates, and specific disagreements.
          </p>
          <Link
            href="/compare"
            className="group inline-flex items-center gap-2 bg-brand text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:bg-brand-dark transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Compare Models
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
      {/* ── Internal Link Directory (SEO) ── */}
      <section className="bg-muted/10 py-16 border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand" />
                Explore Models
              </h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {modelsData.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/models/${m.id}`}
                      className="hover:text-foreground hover:underline underline-offset-2 transition-colors"
                    >
                      {m.display_name} <span className="opacity-50">({m.provider})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-brand" />
                Explore Categories
              </h3>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {hardcodedCategories.map((cat) => (
                  <li key={cat}>
                    <Link
                      href={`/categories/${cat}`}
                      className="hover:text-foreground hover:underline underline-offset-2 transition-colors capitalize"
                    >
                      {cat.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
