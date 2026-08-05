'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import LiveMetricChart from '@/components/charts/LiveMetricChart';
import DataHeatmapD3 from '@/components/charts/DataHeatmapD3';

interface MetricData {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSec: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connexion au serveur Gateway NestJS (port 3001)
    const socket: Socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connecté à la Gateway WebSocket');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Déconnecté de la Gateway');
    });

    // Écoute des événements émis par AnalyticsGateway
    socket.on('analyticsMetrics', (data: MetricData) => {
      setMetrics((prev) => [...prev.slice(-19), data]); // Garde les 20 dernières entrées
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DataPulse Dashboard</h1>
          <p className="text-slate-400 text-sm">Monitoring en temps réel via gRPC & WebSockets</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-400">
            {isConnected ? 'Temps réel actif' : 'Hors ligne'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Ressources Système</h2>
          <LiveMetricChart data={metrics} />
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-200">Activité Réseau (D3 Heatmap)</h2>
          <DataHeatmapD3 data={metrics} />
        </section>
      </div>
    </main>
  );
}