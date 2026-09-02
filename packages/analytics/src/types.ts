// ============================================
// @qalcuity/analytics — Analytics Types
// Centralized type definitions for Analytics & Decision Intelligence
// ============================================

// --------------------------------------------
// Dataset & DataSource
// --------------------------------------------

export type DatasetType = 'finance' | 'crm' | 'hr' | 'inventory' | 'cross_module';

export interface DatasetDefinition {
    id: string;
    name: string;
    nameKey: string;
    type: DatasetType;
    description: string;
    sourceModel: string;
    dimensions: DimensionDefinition[];
    measures: MeasureDefinition[];
}

// --------------------------------------------
// Dimensions
// --------------------------------------------

export type DimensionType = 'nominal' | 'ordinal' | 'temporal' | 'geographic';

export interface DimensionDefinition {
    id: string;
    name: string;
    nameKey: string;
    type: DimensionType;
    sourceField: string;
    sourceModel?: string;
    groupable: boolean;
    filterable: boolean;
    sortable: boolean;
}

// --------------------------------------------
// Measures
// --------------------------------------------

export type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'count_distinct';

export interface MeasureDefinition {
    id: string;
    name: string;
    nameKey: string;
    aggregation: AggregationType;
    sourceField: string;
    sourceModel?: string;
    dataType: 'number' | 'currency' | 'percentage';
    currency?: string;
    formula?: string;
    description?: string;
}

// --------------------------------------------
// Metric Definitions
// --------------------------------------------

export type MetricCategory = 'finance' | 'sales' | 'inventory' | 'hr' | 'crm' | 'cross_module';
export type MetricFormat = 'currency' | 'number' | 'percentage' | 'duration' | 'count';

export interface MetricDefinition {
    id: string;
    name: string;
    nameKey: string;
    description: string;
    category: MetricCategory;
    format: MetricFormat;
    formula: string;
    source: string;
    dataType: string;
    unit?: string;
    aggregationType: AggregationType;
    dimensions: string[];
    measures: string[];
    isDefault: boolean;
}

// --------------------------------------------
// Analytics Query
// --------------------------------------------

export interface AnalyticsQueryConfig {
    dataset: string;
    dimensions: string[];
    measures: string[];
    filters: AnalyticsFilter[];
    dateRange?: DateRange;
    orderBy?: AnalyticsOrderBy[];
    limit?: number;
    offset?: number;
}

export interface AnalyticsFilter {
    field: string;
    operator: FilterOperator;
    value: FilterValue;
    connector?: 'AND' | 'OR';
}

export type FilterOperator =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with'
    | 'between' | 'is_null' | 'is_not_null';

export type FilterValue = string | number | boolean | string[] | number[];

export interface DateRange {
    from: string;
    to: string;
    granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsOrderBy {
    field: string;
    direction: 'asc' | 'desc';
}

// --------------------------------------------
// Analytics Result
// --------------------------------------------

export interface AnalyticsResult {
    data: AnalyticsRow[];
    columns: AnalyticsColumn[];
    metadata: AnalyticsMetadata;
}

export interface AnalyticsRow {
    [key: string]: string | number | boolean | null;
}

export interface AnalyticsColumn {
    key: string;
    name: string;
    nameKey: string;
    type: 'dimension' | 'measure';
    dataType: 'string' | 'number' | 'date' | 'boolean';
    format?: MetricFormat;
}

export interface AnalyticsMetadata {
    totalRows: number;
    executionTimeMs: number;
    queryHash: string;
    generatedAt: string;
}

// --------------------------------------------
// Chart Types
// --------------------------------------------

export type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'treemap';

export interface ChartConfig {
    type: ChartType;
    title: string;
    titleKey?: string;
    dataSource: string;
    xAxis?: ChartAxis;
    yAxis?: ChartAxis;
    series?: ChartSeries[];
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    showLabels?: boolean;
    orientation?: 'horizontal' | 'vertical';
}

export interface ChartAxis {
    field: string;
    label?: string;
    format?: MetricFormat;
}

export interface ChartSeries {
    name: string;
    field: string;
    color?: string;
    type?: ChartType;
}

// --------------------------------------------
// Pivot Table
// --------------------------------------------

export interface PivotConfig {
    dataset: string;
    rowDimensions: string[];
    columnDimensions: string[];
    measures: string[];
    filters: AnalyticsFilter[];
    dateRange?: DateRange;
    valueFormat?: MetricFormat;
}

export interface PivotResult {
    rows: PivotRow[];
    columns: string[];
    grandTotal: AnalyticsRow;
}

export interface PivotRow {
    label: string;
    values: (number | string | null)[];
    subRows?: PivotRow[];
}

// --------------------------------------------
// KPI
// --------------------------------------------

export type KPIStatus = 'above_target' | 'on_target' | 'below_target' | 'critical';

export interface KPIDefinition {
    id: string;
    name: string;
    nameKey: string;
    description?: string;
    category: MetricCategory;
    metricId: string;
    target: number;
    threshold?: {
        warning: number;
        critical: number;
    };
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    ownerId?: string;
    departmentId?: string;
    branchId?: string;
}

export interface KPIEvaluation {
    kpiId: string;
    value: number;
    target: number;
    status: KPIStatus;
    changePercent?: number;
    previousValue?: number;
    evaluatedAt: string;
}

// --------------------------------------------
// Dashboard
// --------------------------------------------

export type DashboardVisibility = 'private' | 'team' | 'department' | 'organization';

export interface DashboardDefinition {
    id: string;
    name: string;
    description?: string;
    visibility: DashboardVisibility;
    ownerId: string;
    layout: DashboardLayout;
    widgets: DashboardWidgetConfig[];
}

export interface DashboardLayout {
    columns: number;
    rowHeight: number;
    isDraggable: boolean;
}

export interface DashboardWidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    position: { x: number; y: number; w: number; h: number };
    config: ChartConfig | KPIWidgetConfig | TableWidgetConfig | TextWidgetConfig;
}

export type WidgetType = 'chart' | 'kpi' | 'table' | 'text' | 'pivot' | 'metric_list';

export interface KPIWidgetConfig {
    kpiId?: string;
    metricId?: string;
    customFormula?: string;
    label?: string;
}

export interface TableWidgetConfig {
    queryConfig: AnalyticsQueryConfig;
    pageSize?: number;
    showPagination?: boolean;
}

export interface TextWidgetConfig {
    content: string;
    markdown?: boolean;
}

// --------------------------------------------
// Saved Analysis
// --------------------------------------------

export interface SavedAnalysis {
    id: string;
    name: string;
    description?: string;
    type: 'query' | 'chart' | 'pivot' | 'dashboard';
    config: AnalyticsQueryConfig | ChartConfig | PivotConfig | DashboardDefinition;
    ownerId: string;
    isStarred: boolean;
    tags: string[];
    lastRunAt?: string;
    createdAt: string;
    updatedAt: string;
}

// --------------------------------------------
// Scheduled Reports
// --------------------------------------------

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ReportOutputFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'email' | 'dashboard_link';

export interface ScheduledReportConfig {
    id: string;
    name: string;
    analysisId: string;
    frequency: ScheduleFrequency;
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    outputFormats: ReportOutputFormat[];
    recipients: string[];
    isActive: boolean;
    lastExecutedAt?: string;
    nextExecutionAt?: string;
}

// --------------------------------------------
// Alert Rules
// --------------------------------------------

export type AlertCondition = 'below' | 'above' | 'equals' | 'not_equals' | 'changes_by';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertRuleConfig {
    id: string;
    name: string;
    description?: string;
    metricId: string;
    condition: AlertCondition;
    threshold: number;
    severity: AlertSeverity;
    notificationChannels: ('in_app' | 'email' | 'slack')[];
    recipients: string[];
    cooldownMinutes: number;
    isActive: boolean;
}

// --------------------------------------------
// Data Dictionary
// --------------------------------------------

export interface DataDictionaryEntry {
    id: string;
    name: string;
    definition: string;
    source: string;
    dataType: string;
    unit?: string;
    formula?: string;
    relatedMetrics: string[];
    lastUpdated: string;
}

// --------------------------------------------
// Data Lineage
// --------------------------------------------

export interface DataLineageNode {
    id: string;
    name: string;
    type: 'metric' | 'measure' | 'field' | 'model';
    source: string;
    formula?: string;
}

export interface DataLineageEdge {
    from: string;
    to: string;
    transformation?: string;
}

export interface DataLineageGraph {
    nodes: DataLineageNode[];
    edges: DataLineageEdge[];
    targetMetric: string;
}
