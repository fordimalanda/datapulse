'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

export default function LiveMetricChart({ metricType = 'cpu_usage' }: { metricType?: string }) {
  const [chartData, setChartData] = useState<{ labels: string[]; values: number[] }>({
    labels: [],
    values: [],
  });

  useEffect(() => {
    socket.emit('subscribe_metrics', { metricType });

    socket.on(`metric_${metricType}`, (point: { value: number; timestamp: number }) => {
      const timeLabel = new Date(point.timestamp * 1000).toLocaleTimeString();

      setChartData((prev) => {
        const newLabels = [...prev.labels, timeLabel].slice(-20); // Conserve les 20 dernières valeurs
        const newValues = [...prev.values, point.value].slice(-20);
        return { labels: newLabels, values: newValues };
      });
    });

    return () => {
      socket.off(`metric_${metricType}`);
    };
  }, [metricType]);

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: `Métrique en direct (${metricType})`,
        data: chartData.values,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="p-4 bg-slate-900 rounded-xl text-white border border-slate-800 shadow-lg">
      <h3 className="text-lg font-semibold mb-4 text-slate-200">DataPulse Live Stream</h3>
      <Line data={data} options={{ responsive: true, animation: { duration: 300 } }} />
    </div>
  );
}