import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AnalyticsService } from './analytics.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class AnalyticsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly analyticsService: AnalyticsService) {}

  @SubscribeMessage('subscribe_metrics')
  handleSubscribeMetrics(@MessageBody() data: { metricType: string }, client: Socket) {
    const stream = this.analyticsService.getMetricsStream(data.metricType);

    const subscription = stream.subscribe({
      next: (metricPoint) => {
        this.server.emit(`metric_${data.metricType}`, metricPoint);
      },
      error: (err) => console.error('Erreur Stream gRPC:', err),
    });

    client.on('disconnect', () => {
      subscription.unsubscribe();
    });
  }
}