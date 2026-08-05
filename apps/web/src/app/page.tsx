'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import LiveMetricChart from '@/components/charts/LiveMetricChart';
import DataHeatmapD3 from '@/components/charts/DataHeatmapD3';

// Format envoyé par le microservice gRPC Python via le Gateway NestJS
interface MetricPoint {
  metric_type: string;
  value: number;
  timestamp: number;
}

// Format formaté pour les composants graphiques (LiveMetricChart / DataHeatmapD3)
export interface FormattedMetric {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSec: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<FormattedMetric[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const gatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Connexion au Gateway NestJS
    const socket: Socket = io(gatewayUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Web App] Connecté au Gateway WebSocket');

      // Souscription explicite aux métriques côté Gateway NestJS
      socket.emit('subscribe_metrics', {
        metricType: 'cpu_usage',
        intervalSeconds: 1,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Web App] Déconnecté du Gateway');
    });

    // Écoute dynamique de la métrique 'cpu_usage' configurée par le Gateway
    socket.on('metric_cpu_usage', (data: MetricPoint) => {
      // Prise en compte du format du timestamp (secondes vs millisecondes)
      const rawTimestamp = data.timestamp > 1e11 ? data.timestamp : data.timestamp * 1000;
      const formattedTime = new Date(rawTimestamp).toLocaleTimeString();

      const newMetric: FormattedMetric = {
        timestamp: formattedTime,
        cpuUsage: data.value,
        memoryUsage: Math.min(100, Math.floor(data.value * 0.85)), // Simulation proportionnelle
        requestsPerSec: Math.floor(data.value * 12),
      };

      setMetrics((prev) => [...prev.slice(-19), newMetric]); // Conserve les 20 derniers points
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* En-tête du Dashboard */}
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DataPulse Dashboard</h1>
          <p className="text-slate-400 text-sm">Monitoring temps réel via gRPC & WebSockets</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-slate-300 font-medium">
            {isConnected ? 'Connecté (gRPC Stream Active)' : 'Hors ligne'}
          </span>
        </div>
      </header>

      {/* Grille des graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Utilisation CPU (%)</h2>
          <LiveMetricChart data={metrics} />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Heatmap d'Activité (D3.js)</h2>
          <DataHeatmapD3 data={metrics} />
        </section>
      </div>
    </main>
  );
}