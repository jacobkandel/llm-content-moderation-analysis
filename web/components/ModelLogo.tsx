import { getLogoUrl } from '@/lib/provider-logos';
import Image from 'next/image';

export default function ModelLogo({ provider, name, className = "h-6 w-6" }: { provider: string, name: string, className?: string }) {
    const url = getLogoUrl(name || provider);

    return (
        <div className={`relative ${className} shrink-0 bg-card rounded-full overflow-hidden border border-border/50`}>
            <Image
                src={url}
                alt={`${provider} logo`}
                fill
                className="object-contain p-0.5"
                onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                unoptimized
            />
        </div>
    );
}
