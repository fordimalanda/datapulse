import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface AnalyticsGrpcService {
  processData(data: { dataset_id: string; raw_values: number[]; timeframe: string }): Observable<{
    dataset_id: string;
    mean: number;
    min: number;
    max: number;
    processed_values: number[];
    timestamp: number;
  }>;
  streamMetrics(data: { metric_type: string; interval_seconds: number }): Observable<{
    metric_type: string;
    value: number;
    timestamp: number;
  }>;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private analyticsGrpcService: AnalyticsGrpcService;

  constructor(@Inject('ANALYTICS_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.analyticsGrpcService = this.client.getService<AnalyticsGrpcService>('AnalyticsService');
  }

  async processDataset(datasetId: string, rawValues: number[]) {
    return this.analyticsGrpcService.processData({
      dataset_id: datasetId,
      raw_values: rawValues,
      timeframe: '1h',
    });
  }

  getMetricsStream(metricType: string) {
    return this.analyticsGrpcService.streamMetrics({
      metric_type: metricType,
      interval_seconds: 1,
    });
  }
}