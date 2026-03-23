/**
 * Visualization Panel - Charts (Recharts) and 3D (Three.js) rendering.
 * This component serves as the base for artifact-driven visualizations.
 * In the future, SemanticRenderer will dispatch artifact types here.
 */

import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Text } from '@react-three/drei';

type ChartType = 'bar' | 'line' | 'pie' | '3d';

// Demo data — will be replaced by artifact payloads from Dataverse
const DEMO_DATA = [
  { name: 'SAP Orders', value: 42, fill: '#6366f1' },
  { name: 'Invoices', value: 28, fill: '#10b981' },
  { name: 'Pending', value: 15, fill: '#f59e0b' },
  { name: 'Errors', value: 5, fill: '#ef4444' },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function VisualizationPanel() {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [jsonInput, setJsonInput] = useState(JSON.stringify(DEMO_DATA, null, 2));
  const [chartData, setChartData] = useState(DEMO_DATA);
  const [parseError, setParseError] = useState<string | null>(null);

  const applyData = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('Data must be an array');
      setChartData(parsed);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  return (
    <div>
      <h3>Visualization Lab</h3>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        Recharts (2D) + Three.js (3D) — feed JSON data to render visualizations.
        In production, artifact payloads from Dataverse drive these components.
      </p>

      {/* Chart type selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {([
          { id: 'bar', label: 'Bar Chart' },
          { id: 'line', label: 'Line Chart' },
          { id: 'pie', label: 'Pie Chart' },
          { id: '3d', label: '3D Scene' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setChartType(t.id)}
            style={{
              padding: '4px 12px',
              background: chartType === t.id ? '#6366f1' : '#e5e7eb',
              color: chartType === t.id ? '#fff' : '#333',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Data input */}
      <details style={{ marginBottom: 12 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
          Data (JSON array)
        </summary>
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: 11, width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={applyData} style={{ padding: '4px 12px' }}>Apply</button>
            {parseError && <span style={{ color: '#ef4444', fontSize: 11 }}>{parseError}</span>}
          </div>
        </div>
      </details>

      {/* Chart rendering */}
      <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 4, padding: 12 }}>
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'pie' && (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={(props) =>
                  `${String(props.name ?? '')} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === '3d' && (
          <div style={{ height: 400 }}>
            <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <OrbitControls />
              {/* Render data as 3D bars */}
              {chartData.map((item, i) => {
                const height = (item.value || 1) / 10;
                return (
                  <group key={i} position={[i * 2 - (chartData.length - 1), height / 2, 0]}>
                    <Box args={[1.2, height, 1.2]}>
                      <meshStandardMaterial color={COLORS[i % COLORS.length]} />
                    </Box>
                    <Text
                      position={[0, height / 2 + 0.5, 0]}
                      fontSize={0.3}
                      color="#333"
                      anchorX="center"
                    >
                      {item.name}: {item.value}
                    </Text>
                  </group>
                );
              })}
              {/* Ground plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#e5e7eb" />
              </mesh>
            </Canvas>
          </div>
        )}
      </div>
    </div>
  );
}
