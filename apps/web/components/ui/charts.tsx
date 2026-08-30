"use client";

import { formatNumber } from "@/lib/utils";

/* ============================================
   BarChart — Simple SVG-based bar chart
   ============================================ */

interface BarChartProps {
    data: number[];
    labels: string[];
    colors?: string[];
    height?: number;
    showValues?: boolean;
    className?: string;
    valuePrefix?: string;
}

export function BarChart({
    data,
    labels,
    colors,
    height = 200,
    showValues = true,
    className = "",
    valuePrefix = "",
}: BarChartProps) {
    const maxValue = Math.max(...data, 1);
    const defaultColors = [
        "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
        "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
    ];

    return (
        <div className={`flex items-end gap-1.5 sm:gap-2 ${className}`} style={{ height }}>
            {data.map((value, index) => {
                const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const color = colors?.[index] || defaultColors[index % defaultColors.length];

                return (
                    <div key={index} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                        {showValues && value > 0 && (
                            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1 truncate w-full text-center">
                                {valuePrefix}{formatNumber(value)}
                            </span>
                        )}
                        <div
                            className="w-full rounded-t transition-all duration-500 ease-out hover:opacity-80"
                            style={{
                                height: `${Math.max(barHeight, 2)}%`,
                                backgroundColor: color,
                                minHeight: value > 0 ? "4px" : "0px",
                            }}
                            title={`${labels[index]}: ${valuePrefix}${formatNumber(value)}`}
                        />
                        <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1 text-center truncate w-full leading-tight">
                            {labels[index]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================
   PieChart — CSS conic-gradient pie chart
   ============================================ */

interface PieChartProps {
    data: number[];
    labels: string[];
    colors: string[];
    size?: number;
    className?: string;
    showLegend?: boolean;
}

export function PieChart({
    data,
    labels,
    colors,
    size = 140,
    className = "",
    showLegend = true,
}: PieChartProps) {
    const total = data.reduce((a, b) => a + b, 0);
    if (total === 0) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                <div
                    className="rounded-full bg-gray-200 dark:bg-gray-700"
                    style={{ width: size, height: size }}
                />
            </div>
        );
    }

    let cumulative = 0;
    const gradient = data
        .map((value, index) => {
            const start = (cumulative / total) * 360;
            cumulative += value;
            const end = (cumulative / total) * 360;
            return `${colors[index]} ${start}deg ${end}deg`;
        })
        .join(", ");

    return (
        <div className={`flex flex-col sm:flex-row items-center gap-4 sm:gap-6 ${className}`}>
            {/* Pie */}
            <div className="relative shrink-0">
                <div
                    className="rounded-full shadow-inner"
                    style={{
                        width: size,
                        height: size,
                        background: `conic-gradient(${gradient})`,
                    }}
                />
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[60%] h-[60%] rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow">
                        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {formatNumber(total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            {showLegend && (
                <div className="space-y-1.5">
                    {labels.map((label, index) => {
                        const pct = total > 0 ? ((data[index] / total) * 100).toFixed(1) : "0.0";
                        return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                    className="w-3 h-3 rounded-sm shrink-0"
                                    style={{ backgroundColor: colors[index] }}
                                />
                                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                    {label}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    ({pct}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ============================================
   LineChart — Simple SVG line chart
   ============================================ */

interface LineChartProps {
    data: number[];
    labels: string[];
    color?: string;
    height?: number;
    className?: string;
    showDots?: boolean;
}

export function LineChart({
    data,
    labels,
    color = "#3B82F6",
    height = 200,
    className = "",
    showDots = true,
}: LineChartProps) {
    const maxValue = Math.max(...data, 1);
    const padding = { top: 20, right: 16, bottom: 30, left: 50 };
    const width = 600;
    const chartHeight = height - padding.top - padding.bottom;
    const chartWidth = width - padding.left - padding.right;

    if (data.length < 2) {
        return (
            <div className={`flex items-center justify-center text-gray-400 text-sm ${className}`} style={{ height }}>
                Minimal 2 data points
            </div>
        );
    }

    const points = data.map((value, index) => {
        const x = padding.left + (index / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
        return { x, y, value };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => ({
        y: padding.top + chartHeight - pct * chartHeight,
        value: Math.round(maxValue * pct),
    }));

    // X-axis labels — show max 12
    const xStep = Math.max(1, Math.floor(labels.length / 12));

    return (
        <div className={`${className}`}>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                {/* Grid lines */}
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line
                            x1={padding.left}
                            y1={tick.y}
                            x2={padding.left + chartWidth}
                            y2={tick.y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            strokeDasharray={i === 0 ? "0" : "4,4"}
                        />
                        <text
                            x={padding.left - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill="#9ca3af"
                        >
                            {formatNumber(tick.value)}
                        </text>
                    </g>
                ))}

                {/* Area fill */}
                <path d={areaD} fill={color} fillOpacity="0.1" />

                {/* Line */}
                <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Dots */}
                {showDots &&
                    points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
                    ))}

                {/* X-axis labels */}
                {labels.map((label, index) => {
                    if (index % xStep !== 0 && index !== labels.length - 1) return null;
                    const x = padding.left + (index / (data.length - 1)) * chartWidth;
                    return (
                        <text key={index} x={x} y={height - 8} textAnchor="middle" fontSize="10" fill="#9ca3af">
                            {label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}
