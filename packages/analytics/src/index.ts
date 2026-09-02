// ============================================
// @qalcuity/analytics — Public API
// Core analytics package for Analytics & Decision Intelligence
// ============================================

// --------------------------------------------
// Types
// --------------------------------------------

export type {
    DatasetDefinition,
    DatasetType,
    DimensionDefinition,
    DimensionType,
    MeasureDefinition,
    AggregationType,
    MetricDefinition,
    MetricCategory,
    MetricFormat,
    AnalyticsQueryConfig,
    AnalyticsFilter,
    FilterOperator,
    FilterValue,
    DateRange,
    AnalyticsOrderBy,
    AnalyticsResult,
    AnalyticsRow,
    AnalyticsColumn,
    AnalyticsMetadata,
    ChartType,
    ChartConfig,
    ChartAxis,
    ChartSeries,
    PivotConfig,
    PivotResult,
    PivotRow,
    KPIStatus,
    KPIDefinition,
    KPIEvaluation,
    DashboardVisibility,
    DashboardDefinition,
    DashboardLayout,
    DashboardWidgetConfig,
    WidgetType,
    KPIWidgetConfig,
    TableWidgetConfig,
    TextWidgetConfig,
    SavedAnalysis,
    ScheduleFrequency,
    ReportOutputFormat,
    ScheduledReportConfig,
    AlertCondition,
    AlertSeverity,
    AlertRuleConfig,
    DataDictionaryEntry,
    DataLineageNode,
    DataLineageEdge,
    DataLineageGraph,
} from './types';

// --------------------------------------------
// Constants
// --------------------------------------------

export { METRIC_DEFINITIONS, getMetricById, getMetricsByCategory, getDefaultMetrics } from './metrics';
export {
    ALL_DATASETS,
    FINANCE_DIMENSIONS,
    CRM_DIMENSIONS,
    HR_DIMENSIONS,
    INVENTORY_DIMENSIONS,
    getDatasetById,
    getDatasetsByType,
} from './dimensions';

// --------------------------------------------
// Engine
// --------------------------------------------

export {
    buildAnalyticsQuery,
    processAnalyticsResults,
    aggregateValues,
    buildTimeSeries,
    calculateChange,
    calculatePercentage,
} from './engine';

// --------------------------------------------
// Utils
// --------------------------------------------

export {
    formatMetricValue,
    getKPIStatus,
    getKPIStatusColor,
    generateAnalyticsId,
    validateQueryConfig,
    truncateText,
    calculateTrend,
} from './utils';
