import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { AnalyticsService } from './analytics.service';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class AnalyticsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // Map pour stocker les souscriptions gRPC actives par socket client (ID client -> Map de métriques)
  private clientSubscriptions = new Map<string, Map<string, Subscription>>();

  constructor(private readonly analyticsService: AnalyticsService) {}

  afterInit() {
    console.log('[AnalyticsGateway] Gateway WebSocket initialisé');
  }

  handleConnection(client: Socket) {
    console.log(`[AnalyticsGateway] Client Web connecté : ${client.id}`);
    this.clientSubscriptions.set(client.id, new Map());
  }

  handleDisconnect(client: Socket) {
    console.log(`[AnalyticsGateway] Client Web déconnecté : ${client.id}`);
    
    // Nettoyage de toutes les souscriptions gRPC du client qui se déconnecte
    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((sub) => sub.unsubscribe());
      this.clientSubscriptions.delete(client.id);
    }
  }

  /**
   * Écoute l'événement WS 'subscribe_metrics' envoyé par le client Web (Next.js)
   */
  @SubscribeMessage('subscribe_metrics')
  handleSubscribeMetrics(
    @MessageBody() data: { metricType?: string; intervalSeconds?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const metricType = data?.metricType || 'cpu_usage';
    const intervalSeconds = data?.intervalSeconds || 1;

    const userSubs = this.clientSubscriptions.get(client.id);
    
    // Évite de souscrire plusieurs fois à la même métrique pour le même client
    if (userSubs?.has(metricType)) {
      return;
    }

    // Connexion au flux gRPC provenant de l'AnalyticsService
    const stream = this.analyticsService.getMetricsStream(metricType, intervalSeconds);

    const subscription = stream.subscribe({
      next: (metricPoint) => {
        // Envoi de la donnée reçue via gRPC directement au client connecté (ou broadcast par canal)
        client.emit(`metric_${metricType}`, metricPoint);
      },
      error: (err) => {
        console.error(`[AnalyticsGateway] Erreur Stream gRPC (${metricType}) :`, err);
      },
    });

    if (userSubs) {
      userSubs.set(metricType, subscription);
    }
  }
}