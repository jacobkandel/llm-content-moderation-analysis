import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/** Safely call .toFixed() — returns '0' if the value is not a finite number. */
const safeFixed = (n: number | null | undefined, d = 1): string =>
    (typeof n === 'number' && isFinite(n) ? n : 0).toFixed(d);

interface RadarSectionProps {
    modelA: string;
    modelB: string;
    highlightDiffs: boolean;
    setHighlightDiffs: (val: boolean) => void;
    displayRadarData: any[];
}

export function RadarSection({
    modelA,
    modelB,
    highlightDiffs,
    setHighlightDiffs,
    displayRadarData
}: RadarSectionProps) {
    return (
        <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                    Side-by-Side Censorship Profile
                </h3>
                <button
                    onClick={() => setHighlightDiffs(!highlightDiffs)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${highlightDiffs
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                >
                    {highlightDiffs ? '✓ Highlighting Differences > 10%' : 'Highlight Differences > 10%'}
                </button>
            </div>
            <div
                className="h-[300px] sm:h-[400px] w-full"
                role="img"
                aria-label={`Radar chart comparing ${modelA} and ${modelB} across ${displayRadarData.length} content categories. ${displayRadarData.map(d => `${d.subject}: ${modelA.split('/').pop()} ${safeFixed(d.A, 0)}% vs ${modelB.split('/').pop()} ${safeFixed(d.B, 0)}%`).join('. ')}`}
            >
                {displayRadarData.length === 0 ? (
                    <div className="h-full w-full flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground text-sm">
                        These models agree closely. No category differs by more than 10%.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={displayRadarData}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Radar
                                name={modelA}
                                dataKey="A"
                                stroke="#800000"
                                strokeWidth={2}
                                fill="#800000"
                                fillOpacity={0.3}
                            />
                            <Radar
                                name={modelB}
                                dataKey="B"
                                stroke="#275D38"
                                strokeWidth={2}
                                fill="#275D38"
                                fillOpacity={0.3}
                            />
                            <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: '1px solid hsl(var(--border))',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'hsl(var(--popover))',
                                    color: 'hsl(var(--popover-foreground))'
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
