'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableTextProps {
    text: string;
    maxLines?: number;
    className?: string;
}

export function ExpandableText({ text, maxLines = 3, className = "" }: ExpandableTextProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;

    return (
        <div className={`relative group ${className}`}>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden cursor-pointer ${isExpanded ? 'max-h-[1000px]' : `max-h-[${maxLines * 1.5}rem]`
                    }`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <p className={`text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {text}
                </p>
            </div>

            {text.length > 100 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#800000] hover:text-[#550000] transition-colors"
                >
                    {isExpanded ? (
                        <><ChevronUp className="w-3 h-3" /> Show Less</>
                    ) : (
                        <><ChevronDown className="w-3 h-3" /> Read More</>
                    )}
                </button>
            )}
        </div>
    );
}
