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
   * Données initiales ou transmises par le composant parent Next.js
   */
  data?: MetricData[];
  /**
   * Type de métrique à écouter en temps réel via Socket.IO
   */
  metricType?: string;
  /**
   * URL du serveur WebSocket (optionnelle)
   */
  socketUrl?: string;
}

export default function LiveMetricChart({
  data: initialData = [],
  metricType = 'cpu_usage',
  socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
}: LiveMetricChartProps) {
  // Extraction des libellés et valeurs de départ à partir de la prop `data`
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>(() => {
    const labels = initialData.map((d) =>
      typeof d.timestamp === 'number'
        ? new Date(d.timestamp * 1000).toLocaleTimeString()
        : d.timestamp
    );
    const values = initialData.map(
      (d) => d.value ?? d.cpuUsage ?? d.memoryUsage ?? d.requestsPerSec ?? 0
    );
    return { labels, values };
  });

  // Mise à jour de l'état local si la prop `data` fournie par le parent change
  useEffect(() => {
    if (initialData.length > 0) {
      const labels = initialData.map((d) =>
        typeof d.timestamp === 'number'
          ? new Date(d.timestamp * 1000).toLocaleTimeString()
          : d.timestamp
      );
      const values = initialData.map(
        (d) => d.value ?? d.cpuUsage ?? d.memoryUsage ?? d.requestsPerSec ?? 0
      );
      setChartData({ labels, values });
    }
  }, [initialData]);

  // Connexion WebSocket en temps réel
  useEffect(() => {
    const socket: Socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socket.emit('subscribe_metrics', { metricType });

    socket.on(`metric_${metricType}`, (point: { value?: number; timestamp: number; cpuUsage?: number }) => {
      const value = point.value ?? point.cpuUsage ?? 0;
      const timeLabel = new Date(
        point.timestamp > 1e11 ? point.timestamp : point.timestamp * 1000
      ).toLocaleTimeString();

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
  }, [metricType, socketUrl]);

  const currentVal =
    chartData.values.length > 0
      ? chartData.values[chartData.values.length - 1]
      : 0;

  const dataset = {
    labels: chartData.labels,
    datasets: [
      {
        label: `Métrique en direct (${metricType})`,
        data: chartData.values,
        borderColor: 'rgb(99, 102, 241)', // Couleur Indigo Tailwind
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="w-full p-5 bg-slate-900 rounded-xl text-white border border-slate-800 shadow-lg flex flex-col gap-4">
      {/* En-tête avec métrique en temps réel */}
      <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">DataPulse Stream</h3>
          <p className="text-xs text-slate-400 capitalize">{metricType}</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold text-indigo-400">
            {currentVal.toFixed(1)}%
          </span>
          <p className="text-xs text-slate-400">{chartData.values.length} points enregistrés</p>
        </div>
      </div>

      {/* Rendu du graphique Chart.js */}
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