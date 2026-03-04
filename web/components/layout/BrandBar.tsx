import Link from 'next/link';

export function BrandBar() {
    return (
        <header className="w-full bg-brand text-white h-[50px] sm:h-[60px] flex items-center justify-between px-4 md:px-8 lg:px-12 z-50 relative shadow-md">
            <div className="flex items-center gap-4 h-full">
                <Link href="/" className="flex items-center gap-3 group h-full py-2 hover:opacity-90 transition-opacity">
                    {/* Enhanced Text */}
                    <div className="flex flex-col justify-center">
                        <span className="font-black text-lg sm:text-xl tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                            MODERATION BIAS
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
