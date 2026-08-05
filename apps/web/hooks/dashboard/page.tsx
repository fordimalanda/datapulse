'use client';

import React, { useState } from 'react';
import { useMetricsStream } from '@/hooks/useMetricsStream';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const [activeMetric, setActiveMetric] = useState<'cpu_usage' | 'memory_usage'>('cpu_usage');
  const { data, isConnected, error } = useMetricsStream({
    metricType: activeMetric,
    intervalSeconds: 1,
    maxPoints: 40,
  });

  // Formater les timestamps pour l'axe X (ex: 14:02:45)
  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: new Date(d.timestamp * 1000).toLocaleTimeString(),
  }));

  const lastValue = data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>DataPulse - Métriques Temps Réel</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            Statut WebSocket :{' '}
            <strong style={{ color: isConnected ? '#10B981' : '#EF4444' }}>
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </strong>
          </span>
          {error && <span style={{ color: '#EF4444' }}>Erreur: {error}</span>}
        </div>
      </header>

      {/* Selecteur de métriques */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => setActiveMetric('cpu_usage')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeMetric === 'cpu_usage' ? '#3B82F6' : '#E5E7EB',
            color: activeMetric === 'cpu_usage' ? '#FFF' : '#000',
            cursor: 'pointer',
          }}
        >
          CPU Usage
        </button>
        <button
          onClick={() => setActiveMetric('memory_usage')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: activeMetric === 'memory_usage' ? '#3B82F6' : '#E5E7EB',
            color: activeMetric === 'memory_usage' ? '#FFF' : '#000',
            cursor: 'pointer',
          }}
        >
          Memory Usage
        </button>
      </div>

      {/* Carte Métrique */}
      <div
        style={{
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '800px',
        }}
      >
        <h2>
          {activeMetric.toUpperCase()} :{' '}
          <span style={{ color: '#3B82F6' }}>{lastValue}%</span>
        </h2>

        {/* Graphique Recharts */}
        <div style={{ width: '100%', height: '350px', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="timeLabel" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}