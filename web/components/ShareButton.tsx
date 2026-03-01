'use client';

import { useState } from 'react';
import { Share2, Twitter, Linkedin, Link as LinkIcon, Check } from 'lucide-react';

interface ShareButtonProps {
    title: string;
    url?: string;
    text?: string;
}

export default function ShareButton({ title, url, text }: ShareButtonProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const shareText = text || `Check out this AI moderation bias analysis: ${title}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleTwitterShare = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
        setShowMenu(false);
    };

    const handleLinkedInShare = () => {
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        window.open(linkedinUrl, '_blank', 'width=550,height=420');
        setShowMenu(false);
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-border"
                title="Share this insight"
            >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
            </button>

            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border py-2 z-20">
                        <button
                            onClick={handleTwitterShare}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground/80 hover:bg-muted/30 transition-colors"
                        >
                            <Twitter className="w-4 h-4 text-blue-400" />
                            Share on Twitter
                        </button>

                        <button
                            onClick={handleLinkedInShare}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground/80 hover:bg-muted/30 transition-colors"
                        >
                            <Linkedin className="w-4 h-4 text-blue-600" />
                            Share on LinkedIn
                        </button>

                        <div className="border-t border-border my-1" />

                        <button
                            onClick={handleCopyLink}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground/80 hover:bg-muted/30 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 text-green-600" />
                                    <span className="text-green-600">Link copied!</span>
                                </>
                            ) : (
                                <>
                                    <LinkIcon className="w-4 h-4 text-muted-foreground/70" />
                                    Copy link
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
