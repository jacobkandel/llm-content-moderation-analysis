'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Brain, BarChart3, ArrowRight, ArrowRightLeft, ChevronRight
} from 'lucide-react';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton';
import { HeroSection } from '@/components/story/HeroSection';
import { SpectrumSection } from '@/components/story/SpectrumSection';
import { CategorySection } from '@/components/story/CategorySection';

// Types for precomputed JSON data
interface SummaryStats {
  totalCases: number;
  modelsCount: number;
  totalEvaluations: number;
  lastUpdated: string;
  dateRange: { start: string; end: string };
  allModels: string[];
  timelineDates: string[];
  distribution: { name: string; value: number }[];
}

interface SpectrumEntry {
  name: string;
  fullName: string;
  refusalRate: number;
  costPer1k: number;
  total: number;
}

interface HeatmapMatrix {
  models: string[];
  categories: string[];
  cells: Record<string, Record<string, { total: number; refusals: number }>>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [spectrumData, setSpectrumData] = useState<SpectrumEntry[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapMatrix | null>(null);

  // Supplementary data for highlights (small JSON files)
  const [driftData, setDriftData] = useState<any[]>([]);
  const [politicalData, setPoliticalData] = useState<any[]>([]);
  const [paternalismData, setPaternalismData] = useState<any[]>([]);
  const [clustersData, setClustersData] = useState<any[]>([]);

  useEffect(() => {
    // Load all precomputed JSON files in parallel (total ~20 KB vs 5.8 MB CSV)
    async function loadData() {
      try {
        const [summary, spectrum, heatmap, drift, political, paternalism, clusters] = await Promise.all([
          fetch('/summary_stats.json').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/spectrum_data.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/heatmap_matrix.json').then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/drift_report.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/political_compass.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/paternalism.json').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/clusters.json').then(r => r.ok ? r.json() : []).catch(() => []),
        ]);

        if (summary) setSummaryStats(summary);
        if (spectrum) setSpectrumData(spectrum);
        if (heatmap) setHeatmapData(heatmap);
        setDriftData(drift);
        setPoliticalData(political);
        setPaternalismData(paternalism);
        setClustersData(clusters);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Calculate stats from precomputed JSON (no CSV parsing!)
  const stats = useMemo(() => {
    if (!summaryStats) return { totalAudits: 0, uniqueModels: 0, topCategories: [], efficiencyTier: { daysSince: 0 } };

    const now = new Date();
    const lastDate = new Date(summaryStats.lastUpdated);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // Derive top categories from heatmap matrix
    let topCategories: { name: string; rate: number; value: number; count: number; total: number }[] = [];
    if (heatmapData) {
      const categoryStats: Record<string, { total: number; refusals: number }> = {};
      for (const model of Object.keys(heatmapData.cells)) {
        for (const [category, cell] of Object.entries(heatmapData.cells[model])) {
          if (!categoryStats[category]) categoryStats[category] = { total: 0, refusals: 0 };
          categoryStats[category].total += cell.total;
          categoryStats[category].refusals += cell.refusals;
        }
      }
      topCategories = Object.entries(categoryStats)
        .map(([name, s]) => ({
          name,
          rate: s.total > 0 ? Math.round((s.refusals / s.total) * 100) : 0,
          value: s.total > 0 ? Math.round((s.refusals / s.total) * 100) : 0,
          count: s.refusals,
          total: s.total,
        }))
        .filter(c => c.rate > 0)
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5);
    }

    return {
      totalAudits: summaryStats.totalEvaluations,
      uniqueModels: summaryStats.modelsCount,
      topCategories,
      efficiencyTier: { daysSince },
    };
  }, [summaryStats, heatmapData]);

  // Model refusal rates from precomputed spectrum data
  const modelRefusalRates = useMemo(() => {
    return spectrumData
      .map(m => ({
        name: m.fullName,
        displayName: m.name,
        rate: Math.round(m.refusalRate),
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [spectrumData]);

  return (
    <main className="min-h-screen bg-background">
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="space-y-6 max-w-4xl w-full px-8">
            <SkeletonCard />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonTable rows={5} />
          </div>
        </div>
      ) : (
        <>
          {/* STORY MODE: Scrollytelling Sections */}
          <HeroSection
            totalAudits={stats.totalAudits}
            uniqueModels={stats.uniqueModels}
          />

          <SpectrumSection
            modelData={modelRefusalRates}
          />

          <CategorySection
            topCategories={stats.topCategories}
          />



          {/* FINAL CTA: Direct users to Deep Dive for interactive exploration */}
          <section className="bg-background py-20 md:py-32">
            <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
              <div className="inline-flex items-center justify-center p-4 bg-foreground/10 rounded-full mb-6">
                <Brain className="h-8 w-8 text-foreground" />
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground">
                Ready to Dig Deeper?
              </h2>

              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Explore the full dataset with interactive filters, charts, and advanced analytics in our Deep Dive section.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/analysis/summary"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-background bg-foreground rounded-full hover:bg-foreground/90 transition-all duration-200 hover:scale-105 shadow-md"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Explore Deep Dive
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/compare"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-foreground border-2 border-border rounded-full hover:bg-accent transition-all duration-200 hover:scale-105"
                >
                  <ArrowRightLeft className="mr-2 h-5 w-5" />
                  Compare Models
                </Link>
              </div>

              <div className="mt-16 pt-8">
                <p className="text-sm text-muted-foreground">
                  {stats.totalAudits.toLocaleString()} audit records • {stats.uniqueModels} models tested • Updated {stats.efficiencyTier.daysSince}d ago
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
