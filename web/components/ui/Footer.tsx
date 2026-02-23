'use client';

export function Footer() {
    return (
        <footer className="bg-muted/30 border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
                <div className="text-sm text-muted-foreground text-center md:text-left">
                    © {new Date().getFullYear()} Moderation Bias. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
