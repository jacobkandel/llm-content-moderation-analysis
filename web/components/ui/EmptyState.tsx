'use client';

import React from 'react';
import { SearchX, Inbox } from 'lucide-react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: 'search' | 'inbox';
}

export function EmptyState({ title, description, icon = 'search' }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-spacing-l bg-card rounded-2xl border border-dashed border-border text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-spacing-s">
                {icon === 'search' ? (
                    <SearchX className="h-8 w-8 text-muted-foreground opacity-50" />
                ) : (
                    <Inbox className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
            </div>
            <h3 className="text-lg font-bold text-foreground mb-spacing-xs">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {description}
            </p>
        </div>
    );
}
