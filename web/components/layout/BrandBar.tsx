import Link from 'next/link';
import { Search } from 'lucide-react';

export function BrandBar() {
    return (
        <header className="w-full bg-brand text-white h-[45px] sm:h-[50px] flex items-center justify-between px-4 md:px-8 lg:px-12 z-50 relative shadow-sm">
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                    <span className="uppercase text-sm tracking-widest font-bold">Moderation Bias</span>
                </Link>
            </div>

            <nav aria-label="Social Links" className="hidden md:flex items-center gap-6">
                {/* Social links removed as per user request */}
            </nav>
        </header>
    );
}
