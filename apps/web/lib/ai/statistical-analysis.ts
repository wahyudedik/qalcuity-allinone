// ─── Statistical Analysis Module ──────────────────────────────────────────────
// Pure TypeScript statistical functions for anomaly detection enhancement.
// NO external dependencies — only standard math operations.
//
// Provides: descriptive statistics, outlier detection (Z-score, IQR, MAD),
// trend analysis, time series analysis, and seasonal pattern detection.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DescriptiveStats {
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    count: number;
    sum: number;
}

export interface PercentileSet {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    iqr: number;
}

export interface OutlierResult {
    index: number;
    value: number;
    method: 'zscore' | 'iqr' | 'mad';
    score: number;
    isOutlier: boolean;
}

export interface TrendAnalysis {
    direction: 'increasing' | 'decreasing' | 'stable';
    slope: number;
    movingAverage7: number[];
    movingAverage30: number[];
    changeRate: number; // percentage change from first to last
}

export interface SeasonalityResult {
    hasSeasonality: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'none';
    confidence: number; // 0-1
    dayOfWeekDistribution: number[]; // 7 values (Sun=0 .. Sat=6)
    hourDistribution: number[]; // 24 values (0-23)
    monthlyDistribution: number[]; // 12 values (Jan=0 .. Dec=11)
}

export interface TimeSeriesAnomaly {
    index: number;
    value: number;
    rollingAverage: number;
    standardDeviation: number;
    deviationMultiple: number;
    type: 'spike' | 'drop';
}

export interface PatternAnomaly {
    type: 'consecutive_identical' | 'round_number_cluster';
    indices: number[];
    values: number[];
    description: string;
}

export interface StatisticalSummary {
    stats: DescriptiveStats;
    percentiles: PercentileSet;
    outlierCount: {
        zscore: number;
        iqr: number;
        mad: number;
    };
    trend: TrendAnalysis;
    seasonality: SeasonalityResult;
    timeSeriesAnomalies: TimeSeriesAnomaly[];
    patternAnomalies: PatternAnomaly[];
}

// ─── A. Descriptive Statistics ───────────────────────────────────────────────

/**
 * Sort numbers in ascending order (non-mutating).
 */
function sortedValues(values: number[]): number[] {
    return [...values].sort((a, b) => a - b);
}

/**
 * Calculate the mean (average) of a numeric array.
 */
export function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the median of a numeric array.
 */
export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = sortedValues(values);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Calculate the mode(s) of a numeric array.
 * Returns all values that appear with the highest frequency.
 */
export function mode(values: number[]): number[] {
    if (values.length === 0) return [];

    const freq = new Map<number, number>();
    for (const v of values) {
        freq.set(v, (freq.get(v) || 0) + 1);
    }

    let maxFreq = 0;
    for (const count of freq.values()) {
        if (count > maxFreq) maxFreq = count;
    }

    // If all values appear once, return empty (no mode)
    if (maxFreq === 1) return [];

    const modes: number[] = [];
    for (const [value, count] of freq) {
        if (count === maxFreq) modes.push(value);
    }
    return modes;
}

/**
 * Calculate the variance of a numeric array (population variance).
 */
export function variance(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = mean(values);
    const squaredDiffs = values.map(v => (v - avg) ** 2);
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate the standard deviation of a numeric array (population).
 */
export function standardDeviation(values: number[]): number {
    return Math.sqrt(variance(values));
}

/**
 * Calculate a specific percentile using linear interpolation.
 */
export function percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = sortedValues(values);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculate full descriptive statistics for a numeric array.
 */
export function descriptiveStats(values: number[]): DescriptiveStats {
    if (values.length === 0) {
        return {
            mean: 0, median: 0, mode: [],
            standardDeviation: 0, variance: 0,
            min: 0, max: 0, count: 0, sum: 0,
        };
    }

    const sorted = sortedValues(values);
    return {
        mean: mean(values),
        median: median(values),
        mode: mode(values),
        standardDeviation: standardDeviation(values),
        variance: variance(values),
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: values.length,
        sum: values.reduce((s, v) => s + v, 0),
    };
}

/**
 * Calculate P25, P50, P75, P95 percentiles and IQR.
 */
export function percentiles(values: number[]): PercentileSet {
    const p25 = percentile(values, 25);
    const p50 = percentile(values, 50);
    const p75 = percentile(values, 75);
    const p95 = percentile(values, 95);
    return {
        p25,
        p50,
        p75,
        p95,
        iqr: p75 - p25,
    };
}

// ─── B. Outlier Detection ────────────────────────────────────────────────────

/**
 * Detect outliers using Z-score method.
 * Flags values where |z| > threshold (default 2.5).
 */
export function detectOutliersZScore(
    values: number[],
    threshold: number = 2.5
): OutlierResult[] {
    if (values.length < 3) return [];

    const avg = mean(values);
    const std = standardDeviation(values);
    if (std === 0) return [];

    return values.map((v, i) => {
        const z = (v - avg) / std;
        return {
            index: i,
            value: v,
            method: 'zscore' as const,
            score: Math.round(z * 100) / 100,
            isOutlier: Math.abs(z) > threshold,
        };
    }).filter(r => r.isOutlier);
}

/**
 * Detect outliers using IQR method.
 * Flags values < Q1 - 1.5*IQR or > Q3 + 1.5*IQR.
 */
export function detectOutliersIQR(values: number[]): OutlierResult[] {
    if (values.length < 4) return [];

    const p = percentiles(values);
    const lowerBound = p.p25 - 1.5 * p.iqr;
    const upperBound = p.p75 + 1.5 * p.iqr;

    return values.map((v, i) => {
        let score: number;
        if (v < lowerBound) {
            score = (lowerBound - v) / (p.iqr || 1);
        } else if (v > upperBound) {
            score = (v - upperBound) / (p.iqr || 1);
        } else {
            score = 0;
        }
        return {
            index: i,
            value: v,
            method: 'iqr' as const,
            score: Math.round(score * 100) / 100,
            isOutlier: v < lowerBound || v > upperBound,
        };
    }).filter(r => r.isOutlier);
}

/**
 * Calculate Median Absolute Deviation (MAD).
 */
export function medianAbsoluteDeviation(values: number[]): number {
    const med = median(values);
    const absoluteDeviations = values.map(v => Math.abs(v - med));
    return median(absoluteDeviations);
}

/**
 * Detect outliers using Modified Z-score (based on MAD).
 * More robust than standard Z-score for skewed distributions.
 * Flags values where modified z > threshold (default 3.5).
 */
export function detectOutliersMAD(
    values: number[],
    threshold: number = 3.5
): OutlierResult[] {
    if (values.length < 3) return [];

    const med = median(values);
    const mad = medianAbsoluteDeviation(values);
    if (mad === 0) return [];

    // 0.6745 is the 0.75th quartile of the standard normal distribution
    const modifiedThreshold = threshold * 0.6745;

    return values.map((v, i) => {
        const modifiedZ = 0.6745 * (v - med) / mad;
        return {
            index: i,
            value: v,
            method: 'mad' as const,
            score: Math.round(modifiedZ * 100) / 100,
            isOutlier: Math.abs(modifiedZ) > modifiedThreshold,
        };
    }).filter(r => r.isOutlier);
}

/**
 * Combined outlier detection — runs all three methods and returns union.
 */
export function detectAllOutliers(values: number[]): OutlierResult[] {
    const zscoreOutliers = detectOutliersZScore(values);
    const iqrOutliers = detectOutliersIQR(values);
    const madOutliers = detectOutliersMAD(values);

    // Merge by index, preferring the method with the highest score
    const outlierMap = new Map<number, OutlierResult>();
    for (const result of [...zscoreOutliers, ...iqrOutliers, ...madOutliers]) {
        const existing = outlierMap.get(result.index);
        if (!existing || Math.abs(result.score) > Math.abs(existing.score)) {
            outlierMap.set(result.index, result);
        }
    }

    return Array.from(outlierMap.values()).sort((a, b) => a.index - b.index);
}

// ─── C. Trend Analysis ───────────────────────────────────────────────────────

/**
 * Calculate Simple Moving Average (SMA) with given window size.
 * Returns an array of the same length (NaN-padded for insufficient data).
 */
export function simpleMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < values.length; i++) {
        if (i < windowSize - 1) {
            result.push(NaN);
        } else {
            const window = values.slice(i - windowSize + 1, i + 1);
            result.push(mean(window));
        }
    }
    return result;
}

/**
 * Determine trend direction using linear regression slope.
 * Returns 'increasing', 'decreasing', or 'stable'.
 */
export function trendDirection(values: number[]): TrendAnalysis {
    if (values.length < 3) {
        return {
            direction: 'stable',
            slope: 0,
            movingAverage7: [],
            movingAverage30: [],
            changeRate: 0,
        };
    }

    // Simple linear regression: y = mx + b
    const n = values.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // Normalize slope relative to mean value
    const avgValue = mean(values);
    const normalizedSlope = avgValue !== 0 ? slope / avgValue : 0;

    // Threshold: 1% change per data point = significant trend
    let direction: 'increasing' | 'decreasing' | 'stable';
    if (normalizedSlope > 0.01) {
        direction = 'increasing';
    } else if (normalizedSlope < -0.01) {
        direction = 'decreasing';
    } else {
        direction = 'stable';
    }

    // Calculate change rate
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changeRate = firstValue !== 0
        ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
        : 0;

    return {
        direction,
        slope: Math.round(slope * 100) / 100,
        movingAverage7: simpleMovingAverage(values, 7),
        movingAverage30: simpleMovingAverage(values, 30),
        changeRate: Math.round(changeRate * 100) / 100,
    };
}

/**
 * Detect seasonality patterns in time-indexed data.
 * Analyzes day-of-week, hour-of-day, and monthly distributions.
 */
export function detectSeasonality(
    timestamps: Date[],
    values: number[]
): SeasonalityResult {
    const result: SeasonalityResult = {
        hasSeasonality: false,
        pattern: 'none',
        confidence: 0,
        dayOfWeekDistribution: new Array(7).fill(0),
        hourDistribution: new Array(24).fill(0),
        monthlyDistribution: new Array(12).fill(0),
    };

    if (timestamps.length < 14) return result;

    // Build distributions
    const dowCounts = new Array(7).fill(0);
    const hourCounts = new Array(24).fill(0);
    const monthCounts = new Array(12).fill(0);
    const dowSums = new Array(7).fill(0);
    const hourSums = new Array(24).fill(0);
    const monthSums = new Array(12).fill(0);

    for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const val = i < values.length ? values[i] : 0;
        const dow = ts.getDay();
        const hour = ts.getHours();
        const month = ts.getMonth();

        dowCounts[dow]++;
        hourCounts[hour]++;
        monthCounts[month]++;
        dowSums[dow] += val;
        hourSums[hour] += val;
        monthSums[month] += val;
    }

    // Calculate average value per period
    const dowAvg = dowCounts.map((c, i) => c > 0 ? dowSums[i] / c : 0);
    const hourAvg = hourCounts.map((c, i) => c > 0 ? hourSums[i] / c : 0);
    const monthAvg = monthCounts.map((c, i) => c > 0 ? monthSums[i] / c : 0);

    result.dayOfWeekDistribution = dowAvg;
    result.hourDistribution = hourAvg;
    result.monthlyDistribution = monthAvg;

    // Calculate coefficient of variation for each distribution
    // Higher CV = more variation = stronger seasonality
    const cvDow = coefficientOfVariation(dowAvg.filter((_, i) => dowCounts[i] > 0));
    const cvHour = coefficientOfVariation(hourAvg.filter((_, i) => hourCounts[i] > 0));
    const cvMonth = coefficientOfVariation(monthAvg.filter((_, i) => monthCounts[i] > 0));

    // Determine dominant pattern
    const maxCv = Math.max(cvDow, cvHour, cvMonth);
    if (maxCv < 0.1) {
        // Low variation — no strong seasonality
        result.hasSeasonality = false;
        result.pattern = 'none';
        result.confidence = 0;
    } else {
        result.hasSeasonality = true;
        result.confidence = Math.min(maxCv / 2, 1); // Normalize to 0-1

        if (cvDow >= cvHour && cvDow >= cvMonth) {
            result.pattern = 'weekly';
        } else if (cvHour >= cvDow && cvHour >= cvMonth) {
            result.pattern = 'daily';
        } else {
            result.pattern = 'monthly';
        }
    }

    return result;
}

// ─── D. Time Series Analysis ─────────────────────────────────────────────────

/**
 * Detect sudden spikes or drops in time series data.
 * Flags points where value differs from rolling average by > n standard deviations.
 */
export function detectSpikes(
    values: number[],
    windowSize: number = 7,
    sigmaThreshold: number = 2
): TimeSeriesAnomaly[] {
    if (values.length < windowSize + 1) return [];

    const anomalies: TimeSeriesAnomaly[] = [];

    for (let i = windowSize; i < values.length; i++) {
        const window = values.slice(i - windowSize, i);
        const windowMean = mean(window);
        const windowStd = standardDeviation(window);

        if (windowStd === 0) continue;

        const deviation = (values[i] - windowMean) / windowStd;

        if (Math.abs(deviation) > sigmaThreshold) {
            anomalies.push({
                index: i,
                value: values[i],
                rollingAverage: Math.round(windowMean * 100) / 100,
                standardDeviation: Math.round(windowStd * 100) / 100,
                deviationMultiple: Math.round(Math.abs(deviation) * 100) / 100,
                type: deviation > 0 ? 'spike' : 'drop',
            });
        }
    }

    return anomalies;
}

/**
 * Detect unusual patterns:
 * 1. Consecutive identical amounts (potential manipulation)
 * 2. Round number clusters (potential estimation/fraud)
 */
export function detectUnusualPatterns(
    values: number[],
    options: {
        consecutiveThreshold?: number;
        roundNumberDivisor?: number;
        clusterThreshold?: number;
    } = {}
): PatternAnomaly[] {
    const {
        consecutiveThreshold = 3,
        roundNumberDivisor = 100000,
        clusterThreshold = 3,
    } = options;

    const patterns: PatternAnomaly[] = [];

    // 1. Detect consecutive identical amounts
    let consecutiveStart = 0;
    let consecutiveCount = 1;
    for (let i = 1; i <= values.length; i++) {
        if (i < values.length && values[i] === values[i - 1]) {
            consecutiveCount++;
        } else {
            if (consecutiveCount >= consecutiveThreshold) {
                patterns.push({
                    type: 'consecutive_identical',
                    indices: Array.from(
                        { length: consecutiveCount },
                        (_, j) => consecutiveStart + j
                    ),
                    values: values.slice(
                        consecutiveStart,
                        consecutiveStart + consecutiveCount
                    ),
                    description: `${consecutiveCount} transaksi berturut-turut dengan jumlah sama (Rp ${values[consecutiveStart].toLocaleString('id-ID')})`,
                });
            }
            consecutiveStart = i;
            consecutiveCount = 1;
        }
    }

    // 2. Detect round number clusters
    const roundNumberIndices: number[] = [];
    const roundNumberValues: number[] = [];
    for (let i = 0; i < values.length; i++) {
        if (
            values[i] >= roundNumberDivisor &&
            values[i] % roundNumberDivisor === 0
        ) {
            roundNumberIndices.push(i);
            roundNumberValues.push(values[i]);
        }
    }

    if (roundNumberIndices.length >= clusterThreshold) {
        patterns.push({
            type: 'round_number_cluster',
            indices: roundNumberIndices,
            values: roundNumberValues,
            description: `${roundNumberIndices.length} dari ${values.length} transaksi (${Math.round((roundNumberIndices.length / values.length) * 100)}%) memiliki jumlah bulat`,
        });
    }

    return patterns;
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Calculate coefficient of variation (CV) = std / mean.
 * Returns 0 if mean is 0.
 */
function coefficientOfVariation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = mean(values);
    if (avg === 0) return 0;
    return standardDeviation(values) / Math.abs(avg);
}

/**
 * Calculate transaction velocity (transactions per day) for given timestamps.
 */
export function calculateVelocity(timestamps: Date[]): {
    daily: number[];
    average: number;
    stdDev: number;
} {
    if (timestamps.length < 2) {
        return { daily: [], average: 0, stdDev: 0 };
    }

    const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
    const dayMap = new Map<string, number>();

    for (const ts of sorted) {
        const dayKey = ts.toISOString().split('T')[0];
        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
    }

    const daily = Array.from(dayMap.values());
    return {
        daily,
        average: mean(daily),
        stdDev: standardDeviation(daily),
    };
}

// ─── Full Statistical Summary ────────────────────────────────────────────────

/**
 * Generate a comprehensive statistical summary for a set of transaction values
 * and their timestamps. This is the main entry point for statistical analysis.
 */
export function generateStatisticalSummary(
    values: number[],
    timestamps: Date[]
): StatisticalSummary {
    const stats = descriptiveStats(values);
    const p = percentiles(values);
    const zscoreOutliers = detectOutliersZScore(values);
    const iqrOutliers = detectOutliersIQR(values);
    const madOutliers = detectOutliersMAD(values);
    const trend = trendDirection(values);
    const seasonality = detectSeasonality(timestamps, values);
    const timeSeriesAnomalies = detectSpikes(values);
    const patternAnomalies = detectUnusualPatterns(values);

    return {
        stats,
        percentiles: p,
        outlierCount: {
            zscore: zscoreOutliers.length,
            iqr: iqrOutliers.length,
            mad: madOutliers.length,
        },
        trend,
        seasonality,
        timeSeriesAnomalies,
        patternAnomalies,
    };
}
