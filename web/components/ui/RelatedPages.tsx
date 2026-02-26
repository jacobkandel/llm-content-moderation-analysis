import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface RelatedPagesProps {
    title: string;
    description: string;
    href: string;
}

export function RelatedPages({ title, description, href }: RelatedPagesProps) {
    return (
        <div className="mt-16 pt-8 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Also see
            </h3>
            <Link
                href={href}
                className="group block p-6 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all hover:border-primary/30"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                            {title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <ArrowRight className="w-5 h-5 text-primary group-hover:text-current transition-colors" />
                    </div>
                </div>
            </Link>
        </div>
    );
}
