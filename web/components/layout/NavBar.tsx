'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard, FileText, TrendingUp, Shield, Compass, Scale, DollarSign,
    Network, ListChecks, Users, Menu, X, ChevronDown, ArrowRightLeft, Info, Home, Box, Filter, Sparkles, ClipboardCheck, Layers, Trophy
} from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallButton } from '@/components/ui/InstallButton';

const navItems = [
    { name: 'AI Overview', href: '/analysis/overview', icon: Sparkles },
    { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { name: 'Comparison', href: '/compare', icon: ArrowRightLeft },
    { name: 'Models', href: '/models', icon: Box },
    { name: 'Categories', href: '/categories', icon: Filter },
    { name: 'Annotate', href: '/annotate', icon: ClipboardCheck },
    {
        name: 'Analysis',
        icon: FileText,
        dropdown: [
            { title: 'Summary', href: '/analysis/summary', icon: FileText },
            { title: 'Reliability', href: '/analysis/reliability', icon: Shield },
            { title: 'Longitudinal Analysis', href: '/analysis/longitudinal', icon: TrendingUp },
            { title: 'Model Stability', href: '/analysis/drift', icon: TrendingUp },
            { title: 'Significance', href: '/analysis/significance', icon: Scale },
            { title: 'Family Analysis', href: '/analysis/family', icon: Layers },
            { title: 'Political Compass', href: '/analysis/political', icon: Compass },
            { title: 'Paternalism', href: '/analysis/paternalism', icon: Shield },
            { title: 'Alignment Tax', href: '/analysis/alignment', icon: DollarSign },
        ]
    },
    {
        name: 'Technical',
        icon: Network,
        dropdown: [
            { title: 'Semantic Clusters', href: '/analysis/clusters', icon: Network },
            { title: 'Trigger List', href: '/analysis/triggers', icon: ListChecks },
            { title: 'Council Consensus', href: '/analysis/consensus', icon: Users },
        ]
    },
    { name: 'About', href: '/about', icon: Info },
];

const mobileOnlyItems = [
    { name: 'Home', href: '/', icon: Home },
];

export function NavBar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    return (
        <nav aria-label="Main Navigation" className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex h-14 items-center justify-between">
                    {/* Left: Mobile Menu & Logo Placeholder/Title if needed */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
                            className="md:hidden p-3 -ml-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                        >
                            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                if (item.dropdown) {
                                    const isActive = item.dropdown.some(sub => pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href)));
                                    return (
                                        <div
                                            key={item.name}
                                            className="relative group"
                                            onMouseEnter={() => setActiveDropdown(item.name)}
                                            onMouseLeave={() => setActiveDropdown(null)}
                                        >
                                            <button
                                                className={cn(
                                                    "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                                    isActive ? "text-brand bg-brand/8 font-semibold" : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.name}
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </button>

                                            <div className="absolute left-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50">
                                                <div className="bg-popover border border-border rounded-md shadow-md p-1">
                                                    {item.dropdown.map(sub => {
                                                        const isChildActive = pathname === sub.href || (sub.href !== '/' && pathname.startsWith(sub.href));
                                                        return (
                                                            <Link
                                                                key={sub.href}
                                                                href={sub.href}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors",
                                                                    isChildActive
                                                                        ? "bg-brand/8 text-brand font-medium"
                                                                        : "text-popover-foreground hover:text-accent-foreground hover:bg-accent"
                                                                )}
                                                            >
                                                                <sub.icon className={cn("h-4 w-4", isChildActive ? "text-brand" : "text-popover-foreground")} />
                                                                {sub.title}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                const isItemActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                                            isItemActive ? "text-brand bg-brand/8 font-semibold" : "text-muted-foreground hover:text-accent-foreground hover:bg-accent"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <InstallButton />
                        <ThemeToggle />
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-border bg-background">
                    <nav aria-label="Mobile Navigation" className="p-4 space-y-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
                        {/* Mobile-only: Home link */}
                        {mobileOnlyItems.map((item) => {
                            const isMobileActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md",
                                        isMobileActive ? "bg-brand/8 text-brand" : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                        {navItems.map((item) => (
                            <div key={item.name} className="space-y-2">
                                {item.dropdown ? (
                                    <>
                                        <div className="font-semibold text-sm px-2 text-muted-foreground">{item.name}</div>
                                        <div className="pl-4 space-y-1">
                                            {item.dropdown.map(sub => (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-2 py-2 text-sm rounded-md",
                                                        pathname === sub.href ? "bg-brand/8 text-brand" : "hover:bg-accent hover:text-accent-foreground"
                                                    )}
                                                >
                                                    <sub.icon className={cn("h-4 w-4", pathname === sub.href ? "text-accent-foreground" : "text-foreground")} />
                                                    {sub.title}
                                                </Link>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    (() => {
                                        const isItemActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                                        return (
                                            <Link
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md",
                                                    isItemActive ? "bg-brand/8 text-brand" : "hover:bg-accent hover:text-accent-foreground"
                                                )}
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.name}
                                            </Link>
                                        );
                                    })()
                                )}
                            </div>
                        ))}
                    </nav>
                </div>
            )}
        </nav>
    );
}
