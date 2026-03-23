import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { CreateVisualInput } from '../../types/agent';
import { InteractiveTable } from './InteractiveTable';

const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

interface VisualizationCardProps {
  input: CreateVisualInput;
}

export function VisualizationCard({ input }: VisualizationCardProps) {
  const { chartType, title, data, xAxisKey, yAxisKey, colors, options } = input;
  const palette = colors ?? DEFAULT_COLORS;

  const yKeys = useMemo(() => {
    if (!yAxisKey) {
      // Auto-detect numeric keys from first data item
      if (data.length === 0) return [];
      const firstItem = data[0];
      return Object.keys(firstItem).filter(k => k !== xAxisKey && typeof firstItem[k] === 'number');
    }
    return Array.isArray(yAxisKey) ? yAxisKey : [yAxisKey];
  }, [yAxisKey, data, xAxisKey]);

  if (chartType === 'table') {
    return (
      <div style={{ margin: '8px 0' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{title}</div>
        <InteractiveTable
          data={data}
          sortable={options?.sortable ?? true}
          filterable={options?.filterable ?? false}
          pageSize={options?.pageSize ?? 10}
        />
      </div>
    );
  }

  if (chartType === '3d') {
    return (
      <div style={{
        margin: '8px 0',
        padding: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{title}</div>
        3D visualization — use the Visualization panel for full 3D rendering
      </div>
    );
  }

  return (
    <div style={{
      margin: '8px 0',
      padding: 16,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{title}</div>
      <ResponsiveContainer width="100%" height={300}>
        {renderChart(chartType, data, xAxisKey, yKeys, palette, options)}
      </ResponsiveContainer>
    </div>
  );
}

function renderChart(
  type: CreateVisualInput['chartType'],
  data: Record<string, unknown>[],
  xAxisKey: string | undefined,
  yKeys: string[],
  colors: string[],
  options?: CreateVisualInput['options'],
) {
  const showLegend = options?.legend ?? yKeys.length > 1;

  switch (type) {
    case 'bar':
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xAxisKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stackId={options?.stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      );

    case 'line':
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xAxisKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Line
              key={key}
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      );

    case 'area':
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xAxisKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          {showLegend && <Legend />}
          {yKeys.map((key, i) => (
            <Area
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              stroke={colors[i % colors.length]}
              fillOpacity={0.3}
              stackId={options?.stacked ? 'stack' : undefined}
            />
          ))}
        </AreaChart>
      );

    case 'pie':
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey={yKeys[0] ?? 'value'}
            nameKey={xAxisKey ?? 'name'}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      );

    case 'scatter':
      return (
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey={xAxisKey} fontSize={12} />
          <YAxis dataKey={yKeys[0]} fontSize={12} />
          <Tooltip />
          <Scatter data={data} fill={colors[0]} />
        </ScatterChart>
      );

    case 'radar':
      return (
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid />
          <PolarAngleAxis dataKey={xAxisKey} fontSize={12} />
          <PolarRadiusAxis fontSize={10} />
          {yKeys.map((key, i) => (
            <Radar
              key={key}
              dataKey={key}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.3}
            />
          ))}
          {showLegend && <Legend />}
        </RadarChart>
      );

    case 'treemap':
      return (
        <Treemap
          data={data}
          dataKey={yKeys[0] ?? 'value'}
          nameKey={xAxisKey ?? 'name'}
          stroke="#fff"
          fill={colors[0]}
        />
      );

    default:
      return (
        <BarChart data={data}>
          <XAxis dataKey={xAxisKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Bar dataKey={yKeys[0]} fill={colors[0]} />
        </BarChart>
      );
  }
}
