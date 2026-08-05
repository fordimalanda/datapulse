import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

// Interface représentant les contrats d'appels gRPC
interface AnalyticsGrpcService {
  processData(data: {
    dataset_id: string;
    raw_values: number[];
    timeframe: string;
  }): Observable<{
    dataset_id: string;
    mean: number;
    min: number;
    max: number;
    processed_values: number[];
    timestamp: number;
  }>;
  streamMetrics(data: {
    metric_type: string;
    interval_seconds: number;
  }): Observable<{
    metric_type: string;
    value: number;
    timestamp: number;
  }>;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private analyticsGrpcService: AnalyticsGrpcService;

  constructor(
    @Inject('ANALYTICS_PACKAGE') private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    // Initialisation du client gRPC à l'initialisation du module NestJS
    this.analyticsGrpcService =
      this.client.getService<AnalyticsGrpcService>('AnalyticsService');
  }

  /**
   * Envoie un jeu de données à traiter par le microservice gRPC
   */
  async processDataset(datasetId: string, rawValues: number[]) {
    return this.analyticsGrpcService.processData({
      dataset_id: datasetId,
      raw_values: rawValues,
      timeframe: '1h',
    });
  }

  /**
   * Souscrit au flux de métriques en temps réel
   */
  getMetricsStream(metricType: string = 'cpu_usage', intervalSeconds: number = 1) {
    return this.analyticsGrpcService.streamMetrics({
      metric_type: metricType,
      interval_seconds: intervalSeconds,
    });
  }
}