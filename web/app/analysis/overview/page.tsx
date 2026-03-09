import { AnalysisProvider } from '../AnalysisContext';
import OverviewContent from './OverviewContent';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Model Overview — Moderation Bias',
    description: 'High-level look at LLM refusal rates and moderation behaviors across all tested categories.',
};

export default function OverviewPage() {
    return (
        <AnalysisProvider>
            <OverviewContent />
        </AnalysisProvider>
    );
}

