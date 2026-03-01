import { AnalysisProvider } from '../AnalysisContext';
import OverviewContent from './OverviewContent';

export default function OverviewPage() {
    return (
        <AnalysisProvider>
            <OverviewContent />
        </AnalysisProvider>
    );
}

