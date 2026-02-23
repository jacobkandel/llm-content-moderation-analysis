import Link from 'next/link';
import { Github, Linkedin, ArrowRight, BookOpen, Target, FlaskConical } from 'lucide-react';

export default function AboutPage() {
    return (
        <main className="max-w-4xl mx-auto py-12 space-y-16">

            <header className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#800000]">About the Project</p>
                <h1 className="text-3xl md:text-4xl font-black text-[#1a1a1a] leading-tight">
                    Bringing Transparency to AI Moderation
                </h1>
                <p className="text-[#555] max-w-2xl leading-relaxed">
                    Moderation Bias is an open-source research platform that audits how LLMs handle content moderation.
                </p>
            </header>

            {/* ── Team cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Jacob */}
                <section className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-sm">
                    <div className="h-1.5 w-full bg-[#800000]" aria-hidden />
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center text-[#800000] text-lg font-black select-none flex-shrink-0">
                                JK
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#1a1a1a]">Jacob Kandel</h2>
                                <p className="text-xs text-[#777]">Creator &amp; Researcher</p>
                            </div>
                        </div>
                        <p className="text-sm text-[#444] leading-relaxed">
                            Jacob is a researcher and engineer focused on AI safety, interpretability, and the
                            sociotechnical impacts of large language models. He built Moderation Bias to create a
                            rigorous, public benchmark for how today's leading AI systems handle sensitive speech.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://github.com/jacobkandel" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#333] transition-colors">
                                <Github className="h-4 w-4" /> jacobkandel
                            </a>
                            <a href="https://www.linkedin.com/in/jacob-kandel" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#333] transition-colors">
                                <Linkedin className="h-4 w-4" /> LinkedIn
                            </a>
                        </div>
                    </div>
                </section>

                {/* Lydia */}
                <section className="bg-white border border-[#e5e5e5] rounded-2xl overflow-hidden shadow-sm">
                    <div className="h-1.5 w-full bg-[#800000]" aria-hidden />
                    <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-xl bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center text-[#800000] text-lg font-black select-none flex-shrink-0">
                                LK
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#1a1a1a]">Lydia Kandel</h2>
                                <p className="text-xs text-[#777]">Collaborator &amp; Marketer</p>
                            </div>
                        </div>
                        <p className="text-sm text-[#444] leading-relaxed">
                            Lydia is a marketer focused on startup ecosystems and growing technical communities.
                            She helps bring Moderation Bias's research to the developers, researchers, and builders
                            who need it most.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://www.linkedin.com/in/lydiakandel" target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-sm text-[#777] hover:text-[#333] transition-colors">
                                <Linkedin className="h-4 w-4" /> LinkedIn
                            </a>
                        </div>
                    </div>
                </section>

            </div>



            {/* Content sections — editorial left-rule style */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">

                {/* The Problem */}
                <div className="border-l-4 border-[#800000] pl-6 space-y-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#800000]">The Problem</h2>
                    <p className="text-[#444] leading-relaxed">
                        As AI models become central to how we access information, they are increasingly making
                        subjective decisions about what content is &ldquo;safe,&rdquo; &ldquo;appropriate,&rdquo; or &ldquo;harmful.&rdquo; However,
                        these safety guardrails are not standardized. A prompt that one model flags as dangerous,
                        another might process without issue. We built this tool to bring transparency to these
                        invisible boundaries.
                    </p>
                </div>

                {/* Our Methodology */}
                <div className="border-l-4 border-[#800000] pl-6 space-y-2">
                    <h2 className="text-sm font-black uppercase tracking-widest text-[#800000]">Our Methodology</h2>
                    <p className="text-[#444] leading-relaxed">
                        We systematically test top models — including Claude, Gemini, GPT-4, and open-source
                        alternatives — against a rigorous set of edge-case prompts. By categorizing these tests
                        into areas like False Positive Control, Paternalism, and Political Alignment, we can map
                        exact &ldquo;Reject Rates&rdquo; and compare their refusal behaviors side-by-side.
                    </p>
                    <p className="text-[#444] leading-relaxed">
                        Our goal is not to decide which model is &ldquo;right,&rdquo; but to provide developers, researchers,
                        and users with hard data on how different AI systems are aligned.
                    </p>
                </div>

            </div>

            {/* ── Limitations callout ── */}
            <section className="bg-muted/40 border border-border rounded-2xl p-8 space-y-3">
                <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <h2 className="text-base font-bold text-foreground">Known Limitations</h2>
                </div>
                <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-disc list-inside">
                    <li>Results reflect a snapshot in time — models are updated frequently and policies can change without notice.</li>
                    <li>The judge model introduces its own potential bias in scoring.</li>
                    <li>Low-tier models are audited bi-weekly; higher-tier models are audited manually on an irregular schedule.</li>
                    <li>English-language prompts only — cross-lingual behaviour is not yet tested.</li>
                </ul>
            </section>

            {/* ── CTA ── */}
            <div className="flex items-center gap-4 pt-2">
                <Link
                    href="/compare"
                    className="group inline-flex items-center gap-2 bg-[#800000] text-white font-bold text-sm px-6 py-3 rounded-lg shadow-sm hover:bg-[#555] transition-all hover:scale-105 active:scale-95"
                >
                    Explore the Data
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                    href="https://github.com/jacobkandel/llm-content-moderation-analysis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-[#555] hover:text-[#333] transition-colors"
                >
                    <Github className="h-4 w-4" />
                    View Source on GitHub
                </a>
            </div>
        </main>
    );
}
