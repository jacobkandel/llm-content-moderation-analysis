import Link from 'next/link';
import { Layers } from 'lucide-react';

export function BrandBar() {
    return (
        <header className="w-full bg-brand text-white h-[50px] sm:h-[60px] flex items-center justify-between px-4 md:px-8 lg:px-12 z-50 relative shadow-md">
            <div className="flex items-center gap-4 h-full">
                <Link href="/" className="flex items-center gap-3 group h-full py-2">
                    {/* New Icon - The Prism/Layers Concept */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-white/20 to-transparent border border-white/10 shadow-sm flex items-center justify-center group-hover:scale-105 group-hover:from-white/30 transition-all duration-300">
                        <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-amber-100 transition-colors" strokeWidth={2.5} />
                    </div>

                    {/* Enhanced Text */}
                    <div className="flex flex-col justify-center translate-y-[2px]">
                        <span className="font-black text-lg sm:text-xl tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                            MODERATION BIAS
                        </span>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/70 font-mono mt-0.5 group-hover:text-amber-100/80 transition-colors">
                            Live LLM Audit
                        </span>
                    </div>
                </Link>
            </div>

            <nav aria-label="Social Links" className="hidden md:flex items-center gap-6">
                {/* Social links removed as per user request */}
            </nav>
        </header>
    );
}
