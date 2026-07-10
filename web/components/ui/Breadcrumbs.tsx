'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React, { useMemo } from 'react';

// Maps certain route segments to more friendly display names
const routeNames: Record<string, string> = {
    'analysis': 'Analysis',
    // Analysis sub-pages
    'overview': 'Overview',
    'summary': 'Summary',
    'significance': 'Statistical Significance',
    'reliability': 'Model Reliability',
    'paternalism': 'Paternalism',
    'political': 'Political Compass',
    'political-compass': 'Political Compass',
    'drift': 'Model Drift',
    'longitudinal': 'Longitudinal Trends',
    'consensus': 'Council Consensus',
    'clusters': 'Semantic Clustering',
    'triggers': 'Trigger Words',
    'alignment': 'Alignment Tax',
    'iaa': 'Inter-Annotator Agreement',
    'overrefusal': 'Over-Refusal',
    'family': 'Model Families',
    // Top-level pages
    'compare': 'Compare Models',
    'audit': 'Raw Audit Log',
    'categories': 'Categories',
    'models': 'Models',
    'leaderboard': 'Leaderboard',
    'annotate': 'Annotate',
    'data': 'Access the Data',
    'prompts': 'Prompt Explorer',
    'glossary': 'Glossary',
    // Technical sub-pages
    'technical': 'Technical',
    'methodology': 'Methodology',
    'about': 'About',
    // Dynamic segments
    'v1': 'API v1',
};

export function Breadcrumbs() {
    const pathname = usePathname();

    const breadcrumbs = useMemo(() => {
        if (pathname === '/') return [];

        const segments = pathname.split('/').filter(Boolean);
        const crumbs = [];

        // Always start with Home
        crumbs.push({
            href: '/',
            label: <Home className="w-4 h-4 text-muted-foreground/50" aria-label="Home" />,
            isIcon: true,
            isLast: false
        });

        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === segments.length - 1;

            // Format label: check map first, then try to decode URI and capitalize
            let label = routeNames[segment];
            if (!label) {
                const decoded = decodeURIComponent(segment).replace(/-/g, ' ');
                label = decoded.charAt(0).toUpperCase() + decoded.slice(1);
            }

            crumbs.push({
                href: currentPath,
                label,
                isLast
            });
        });

        return crumbs;
    }, [pathname]);

    if (breadcrumbs.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
            <ol className="flex items-center text-sm text-muted-foreground">
                {breadcrumbs.map((crumb) => {
                    const isLast = crumb.isLast;
                    return (
                        <li key={crumb.href} className="flex items-center">
                            {isLast ? (
                                <span className={`font-semibold text-foreground ${crumb.isIcon ? 'flex items-center' : ''}`} aria-current="page">
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    href={crumb.href}
                                    className={`hover:text-foreground transition-colors ${crumb.isIcon ? 'flex items-center' : ''}`}
                                >
                                    {crumb.label}
                                </Link>
                            )}

                            {!isLast && (
                                <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground/50 shrink-0" />
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
