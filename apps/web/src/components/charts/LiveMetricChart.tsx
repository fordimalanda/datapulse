'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Enregistrement des composants requis pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export interface MetricData {
  timestamp: string | number;
  cpuUsage?: number;
  memoryUsage?: number;
  requestsPerSec?: number;
  value?: number;
}

export interface LiveMetricChartProps {
  /**
   * Données transmises par le composant parent Next.js (ex: page.tsx)
   */
  data?: MetricData[];
  /**
   * Type de métrique à écouter via Socket.IO si le composant est utilisé de manière autonome
   */
  metricType?: string;
  /**
   * URL du serveur Gateway WebSocket NestJS (Port 3001 par défaut)
   */
  socketUrl?: string;
}

export default function LiveMetricChart({
  data: initialData = [],
  metricType = 'cpu_usage',
  socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
}: LiveMetricChartProps) {
  // Extraction des libellés et valeurs de départ à partir de la prop `data`
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>(() => {
    const labels = initialData.map((d) =>
      typeof d.timestamp === 'number'
        ? new Date(d.timestamp * 1000).toLocaleTimeString()
        : String(d.timestamp)
    );
    const values = initialData.map(
      (d) => d.value ?? d.cpuUsage ?? d.memoryUsage ?? d.requestsPerSec ?? 0
    );
    return { labels, values };
  });

  const hasExternalData = initialData.length > 0;

  // 1. Synchronisation si des données sont fournies par le composant parent (ex: page.tsx)
  useEffect(() => {
    if (hasExternalData) {
      const labels = initialData.map((d) =>
        typeof d.timestamp === 'number'
          ? new Date(d.timestamp * 1000).toLocaleTimeString()
          : String(d.timestamp)
      );
      const values = initialData.map(
        (d) => d.value ?? d.cpuUsage ?? d.memoryUsage ?? d.requestsPerSec ?? 0
      );
      setChartData({ labels, values });
    }
  }, [initialData, hasExternalData]);

  // 2. Connexion WebSocket interne UNIQUEMENT si AUCUNE donnée externe n'est fournie
  useEffect(() => {
    // Si la page parent gère déjà la connexion Socket, on n'ouvre pas de socket interne.
    if (hasExternalData) return;

    const socket: Socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socket.emit('subscribe_metrics', { metricType });

    socket.on(`metric_${metricType}`, (point: { value?: number; timestamp: number; cpuUsage?: number }) => {
      const value = point.value ?? point.cpuUsage ?? 0;
      const rawTimestamp = point.timestamp > 1e11 ? point.timestamp : point.timestamp * 1000;
      const timeLabel = new Date(rawTimestamp).toLocaleTimeString();

      setChartData((prev) => {
        const newLabels = [...prev.labels, timeLabel].slice(-20); // Conserve les 20 derniers points
        const newValues = [...prev.values, value].slice(-20);
        return { labels: newLabels, values: newValues };
      });
    });

    return () => {
      socket.off(`metric_${metricType}`);
      socket.disconnect();
    };
  }, [metricType, socketUrl, hasExternalData]);

  const currentVal =
    chartData.values.length > 0
      ? chartData.values[chartData.values.length - 1]
      : 0;

  const dataset = {
    labels: chartData.labels,
    datasets: [
      {
        label: `Métrique (${metricType})`,
        data: chartData.values,
        borderColor: 'rgb(99, 102, 241)', // Indigo Tailwind
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Affichage synthétique de la valeur courante */}
      <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-3xl font-extrabold text-indigo-400">
            {currentVal.toFixed(1)}%
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {chartData.values.length} points enregistrés
        </span>
      </div>

      {/* Rendu graphique Chart.js */}
      <div className="relative h-64 w-full">
        {chartData.values.length > 0 ? (
          <Line
            data={dataset}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              animation: { duration: 300 },
              scales: {
                x: {
                  ticks: { color: '#94a3b8' },
                  grid: { color: '#1e293b' },
                },
                y: {
                  ticks: { color: '#94a3b8' },
                  grid: { color: '#1e293b' },
                  beginAtZero: true,
                  max: 100,
                },
              },
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
              },
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">
            En attente de données gRPC...
          </div>
        )}
      </div>
    </div>
  );
}