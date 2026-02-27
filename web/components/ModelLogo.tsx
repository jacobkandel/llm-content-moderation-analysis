import { getLogoUrl } from '@/lib/provider-logos';

export default function ModelLogo({ provider, name, className = "h-6 w-6" }: { provider: string, name: string, className?: string }) {
    const url = getLogoUrl(name || provider);

    return (
        <div className={`relative ${className} shrink-0 bg-card rounded-full overflow-hidden border border-border/50`}>
            <img
                src={url}
                alt={`${provider} logo`}
                className="object-contain p-0.5 w-full h-full"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    );
}
