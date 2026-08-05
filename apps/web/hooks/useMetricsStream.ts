import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface MetricPoint {
  metric_type: string;
  value: number;
  timestamp: number;
}

interface UseMetricsStreamOptions {
  metricType?: string;
  intervalSeconds?: number;
  maxPoints?: number;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3001';

export function useMetricsStream({
  metricType = 'cpu_usage',
  intervalSeconds = 1,
  maxPoints = 30,
}: UseMetricsStreamOptions = {}) {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connexion à la Gateway WebSocket NestJS
    const socket = io(GATEWAY_URL, {
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // Souscription au stream pour la métrique demandée
      socket.emit('subscribe_metrics', {
        metricType,
        intervalSeconds,
      });
    });

    // Écoute des métriques entrantes
    socket.on(`metric_${metricType}`, (point: MetricPoint) => {
      setData((prevData) => {
        const updated = [...prevData, point];
        // Garde uniquement les N derniers points (fenêtre glissante)
        if (updated.length > maxPoints) {
          return updated.slice(updated.length - maxPoints);
        }
        return updated;
      });
    });

    socket.on('streamError', (err: { message: string }) => {
      setError(err.message);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.off(`metric_${metricType}`);
      socket.off('streamError');
      socket.disconnect();
    };
  }, [metricType, intervalSeconds, maxPoints]);

  const clearData = useCallback(() => {
    setData([]);
  }, []);

  return { data, isConnected, error, clearData };
}