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
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Subscription } from 'rxjs';
import { AnalyticsService } from './analytics.service';

export interface SubscribeMetricsPayload {
  metricType?: string;
  intervalSeconds?: number;
  interval?: number; // Prise en charge de la rétrocompatibilité
}

export interface UnsubscribeMetricsPayload {
  metricType?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AnalyticsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AnalyticsGateway.name);

  // Map imbriquée : Client Socket ID -> Map<metricType, Subscription gRPC>
  private clientSubscriptions = new Map<string, Map<string, Subscription>>();

  constructor(private readonly analyticsService: AnalyticsService) {}

  afterInit() {
    this.logger.log('Gateway WebSocket (Analytics) initialisé.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client Web connecté : ${client.id}`);
    this.clientSubscriptions.set(client.id, new Map());
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client Web déconnecté : ${client.id}`);

    // Nettoyage automatique de toutes les souscriptions gRPC du client
    const userSubs = this.clientSubscriptions.get(client.id);
    if (userSubs) {
      userSubs.forEach((sub, type) => {
        sub.unsubscribe();
        this.logger.debug(
          `Souscription gRPC [${type}] résiliée pour socket ${client.id}`,
        );
      });
      userSubs.clear();
      this.clientSubscriptions.delete(client.id);
    }
  }

  /**
   * Souscrit au flux gRPC d'une métrique spécifique et la retransmet au client Next.js
   * Événement WebSocket : 'subscribe_metrics' (ou 'startMetrics' pour rétrocompatibilité)
   */
  @SubscribeMessage('subscribe_metrics')
  @SubscribeMessage('startMetrics')
  handleSubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribeMetricsPayload,
  ) {
    const metricType = payload?.metricType || 'cpu_usage';
    const intervalSeconds =
      payload?.intervalSeconds || payload?.interval || 1;

    let userSubs = this.clientSubscriptions.get(client.id);
    if (!userSubs) {
      userSubs = new Map<string, Subscription>();
      this.clientSubscriptions.set(client.id, userSubs);
    }

    // Si le client est déjà souscrit à cette métrique, résiliation de l'ancienne souscription avant de la remplacer
    if (userSubs.has(metricType)) {
      this.logger.warn(
        `Remplacement du stream existant [${metricType}] pour le client ${client.id}`,
      );
      userSubs.get(metricType)?.unsubscribe();
      userSubs.delete(metricType);
    }

    this.logger.log(
      `Démarrage du stream gRPC '${metricType}' (intervalle: ${intervalSeconds}s) pour ${client.id}`,
    );

    // Récupération du flux depuis AnalyticsService (Client gRPC Python)
    const stream$ = this.analyticsService.getMetricsStream(
      metricType,
      intervalSeconds,
    );

    const subscription = stream$.subscribe({
      next: (data) => {
        // Envoi au canal générique 'metricData' ET au canal spécifique 'metric_{metricType}'
        client.emit('metricData', data);
        client.emit(`metric_${metricType}`, data);
      },
      error: (err) => {
        this.logger.error(
          `Erreur Stream gRPC [${metricType}] pour socket ${client.id}:`,
          err.message || err,
        );
        client.emit('streamError', {
          metricType,
          message: err.message || 'Interruption du flux gRPC',
        });
        userSubs?.delete(metricType);
      },
      complete: () => {
        this.logger.log(
          `Stream gRPC [${metricType}] terminé pour socket ${client.id}`,
        );
        client.emit('streamComplete', { metricType });
        userSubs?.delete(metricType);
      },
    });

    userSubs.set(metricType, subscription);
  }

  /**
   * Permet à un client de se désabonner manuellement d'une métrique sans couper la socket WS
   * Événement WebSocket : 'unsubscribe_metrics'
   */
  @SubscribeMessage('unsubscribe_metrics')
  handleUnsubscribeMetrics(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnsubscribeMetricsPayload,
  ) {
    const metricType = payload?.metricType || 'cpu_usage';
    const userSubs = this.clientSubscriptions.get(client.id);

    if (userSubs && userSubs.has(metricType)) {
      userSubs.get(metricType)?.unsubscribe();
      userSubs.delete(metricType);
      this.logger.log(
        `Désabonnement de la métrique [${metricType}] exécuté pour ${client.id}`,
      );
      client.emit('unsubscribed', { metricType });
    }
  }
}