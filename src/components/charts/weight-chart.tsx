"use client";

interface WeightDataPoint {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: WeightDataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">グラフに表示するデータがありません</p>
    );
  }

  // Use chronological order for the chart
  const chartData = [...data].reverse();
  const latestWeight = data[0].weight;

  const weights = chartData.map((d) => d.weight);
  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const weightRange = maxWeight - minWeight || 1;

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = 400;
  const chartHeight = 200;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate point positions
  const points = chartData.map((d, i) => ({
    x: padding.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * innerWidth : innerWidth / 2),
    y: padding.top + innerHeight - ((d.weight - minWeight) / weightRange) * innerHeight,
    ...d,
  }));

  // Build polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minWeight + (weightRange * i) / 4;
    const y = padding.top + innerHeight - (i / 4) * innerHeight;
    return { value: Math.round(value * 10) / 10, y };
  });

  // X-axis labels (show a subset)
  const maxXLabels = Math.min(chartData.length, 6);
  const xLabelIndices = Array.from({ length: maxXLabels }, (_, i) =>
    Math.round((i / (maxXLabels - 1)) * (chartData.length - 1))
  );

  return (
    <div className="space-y-3">
      <div className="text-center">
        <span className="text-3xl font-bold">{latestWeight}</span>
        <span className="ml-1 text-sm text-muted-foreground">kg</span>
        <p className="text-xs text-muted-foreground mt-1">最新の体重</p>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick.value}
            x1={padding.left}
            y1={tick.y}
            x2={chartWidth - padding.right}
            y2={tick.y}
            stroke="currentColor"
            strokeOpacity={0.1}
            strokeWidth={0.5}
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick.value}
            x={padding.left - 5}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {tick.value}
          </text>
        ))}

        {/* X-axis labels */}
        {xLabelIndices.map((idx) => {
          const point = points[idx];
          if (!point) return null;
          // Shorten date label
          const label = chartData[idx].date.replace(/^\d{4}\//, "");
          return (
            <text
              key={idx}
              x={point.x}
              y={chartHeight - 5}
              textAnchor="middle"
              fontSize={8}
              fill="currentColor"
              fillOpacity={0.5}
            >
              {label}
            </text>
          );
        })}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="hsl(var(--primary))"
          />
        ))}
      </svg>
    </div>
  );
}
