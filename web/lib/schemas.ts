/**
 * Zod schemas for validating pre-computed JSON data files.
 *
 * These ensure that if compress_data.py produces malformed output,
 * we catch it at build time rather than silently breaking the UI.
 */

import { z } from 'zod';

// --- Summary Stats ---
export const SummaryStatsSchema = z.object({
  totalCases: z.number(),
  modelsCount: z.number(),
  totalEvaluations: z.number(),
  statisticalPowerMDES: z.number().optional(),
  lastUpdated: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  allModels: z.array(z.string()),
  timelineDates: z.array(z.string()),
  distribution: z.array(z.object({
    name: z.string(),
    value: z.number(),
  })),
});
export type SummaryStats = z.infer<typeof SummaryStatsSchema>;

// --- Model Registry ---
export const ModelEntrySchema = z.object({
  id: z.string(),
  strict_id: z.string().optional(),
  name: z.string(),
  display_name: z.string(),
  provider: z.string(),
  region: z.string(),
  tier: z.string(),
  cost_per_m_in: z.number(),
  cost_per_m_out: z.number(),
});
export type ModelEntry = z.infer<typeof ModelEntrySchema>;
export const ModelRegistrySchema = z.array(ModelEntrySchema);

// --- Spectrum Data ---
export const SpectrumEntrySchema = z.object({
  name: z.string(),
  fullName: z.string(),
  refusalRate: z.number(),
  refusalRateCILower: z.number().optional(),
  refusalRateCIUpper: z.number().optional(),
  costPer1k: z.number().optional(),
  total: z.number(),
});
export type SpectrumEntry = z.infer<typeof SpectrumEntrySchema>;

// --- Heatmap Matrix ---
export const HeatmapMatrixSchema = z.object({
  models: z.array(z.string()),
  categories: z.array(z.string()),
  cells: z.record(z.string(), z.record(z.string(), z.object({
    total: z.number(),
    refusals: z.number(),
  }))),
});
export type HeatmapMatrix = z.infer<typeof HeatmapMatrixSchema>;

// --- Consensus Stats ---
export const ConsensusStatsSchema = z.object({
  totalPrompts: z.number(),
  distribution: z.array(z.object({
    name: z.string(),
    value: z.number(),
  })),
  perModel: z.array(z.object({
    model: z.string(),
    shortName: z.string(),
    agreementRate: z.number(),
    kappa: z.number(),
    total: z.number(),
  })),
});
export type ConsensusStats = z.infer<typeof ConsensusStatsSchema>;

// --- Reliability Scores ---
export const ReliabilityScoresSchema = z.object({
  globalKappa: z.number(),
  interpretation: z.string(),
  modelsCount: z.number(),
  promptsCount: z.number(),
  perModel: z.array(z.object({
    model: z.string(),
    displayName: z.string(),
    score: z.number(),
    total: z.number(),
  })),
});
export type ReliabilityScores = z.infer<typeof ReliabilityScoresSchema>;

// --- Compare Data ---
export const CompareDataSchema = z.object({
  models: z.array(z.string()),
  categories: z.array(z.string()),
  dates: z.array(z.string()),
  modelStats: z.record(z.string(), z.object({
    refusalRate: z.number(),
    refusalRateCILower: z.number().optional(),
    refusalRateCIUpper: z.number().optional(),
    avgVerbosity: z.number().optional(),
    total: z.number(),
    categoryRates: z.record(z.string(), z.object({
      rate: z.number(),
      ciLower: z.number().optional(),
      ciUpper: z.number().optional(),
    })),
  })),
  pairwiseDisagreements: z.record(z.string(), z.number()),
});
export type CompareData = z.infer<typeof CompareDataSchema>;

// --- Significance Pairwise ---
export const SignificancePairSchema = z.object({
  modelA: z.string(),
  modelB: z.string(),
  pValue: z.number(),
  pValueAdjusted: z.number().optional(),
  cohensH: z.number().optional(),
  samples: z.number(),
  disagreements: z.number(),
  significant: z.boolean(),
});
export type SignificancePair = z.infer<typeof SignificancePairSchema>;

// --- Longitudinal Data ---
export const LongitudinalDataSchema = z.object({
  chartData: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
  activeModels: z.array(z.string()),
});
export type LongitudinalData = z.infer<typeof LongitudinalDataSchema>;

/**
 * Safe data loader with validation.
 * Returns parsed data or throws with a descriptive error.
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown, name: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Schema Validation] ${name} failed:`, result.error.issues);
    throw new Error(`Invalid data for ${name}: ${result.error.issues.map(i => i.message).join(', ')}`);
  }
  return result.data;
}
