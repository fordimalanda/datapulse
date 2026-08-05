import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

// --- Contrats de données gRPC (DTOs / Interfaces) ---

export interface ProcessDataRequest {
  dataset_id: string;
  raw_values: number[];
  timeframe?: string;
}

export interface ProcessDataResponse {
  dataset_id: string;
  mean: number;
  min: number;
  max: number;
  processed_values: number[];
  timestamp: number;
}

export interface StreamMetricsRequest {
  metric_type: string;
  interval_seconds: number;
}

export interface MetricPoint {
  metric_type: string;
  value: number;
  timestamp: number;
}

// Interface du contrat d'appel gRPC reflétant le Proto
interface AnalyticsGrpcService {
  processData(data: ProcessDataRequest): Observable<ProcessDataResponse>;
  streamMetrics(data: StreamMetricsRequest): Observable<MetricPoint>;
}

@Injectable()
export class AnalyticsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private analyticsGrpcService: AnalyticsGrpcService;

  constructor(
    @Inject('ANALYTICS_PACKAGE') private readonly client: ClientGrpc,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Initialisation du client gRPC après l'enregistrement du module NestJS
   */
  onModuleInit() {
    try {
      this.analyticsGrpcService =
        this.client.getService<AnalyticsGrpcService>('AnalyticsService');
      this.logger.log('Client gRPC AnalyticsService initialisé avec succès.');
    } catch (error) {
      this.logger.error(
        "Échec de l'initialisation du service gRPC AnalyticsService",
        error,
      );
    }
  }

  /**
   * Fermeture propre du canal gRPC à la destruction du module
   */
  async onModuleDestroy() {
    if (this.client && typeof (this.client as any).close === 'function') {
      await (this.client as any).close();
      this.logger.log('Connexion gRPC AnalyticsService fermée.');
    }
  }

  /**
   * Appelle gRPC processData (RPC Unaire) ET persiste automatiquement les résultats dans PostgreSQL via Prisma
   *
   * @param datasetId Identifiant unique du dataset
   * @param rawValues Tableau de valeurs numériques brutes
   * @param timeframe Optionnel - Fenêtre temporelle (ex: '1h')
   */
  processData(
    datasetId: string,
    rawValues: number[],
    timeframe: string = '1h',
  ): Observable<ProcessDataResponse> {
    const payload: ProcessDataRequest = {
      dataset_id: datasetId,
      raw_values: rawValues,
      timeframe,
    };

    return this.analyticsGrpcService.processData(payload).pipe(
      tap(async (response) => {
        // Enregistrement asynchrone dans Postgres via Prisma
        try {
          await this.prisma.processDataResult.create({
            data: {
              datasetId: response.dataset_id,
              mean: response.mean,
              min: response.min,
              max: response.max,
              processedValues: response.processed_values,
              timeframe,
            },
          });
          this.logger.log(
            `Résultat d'analyse sauvegardé en base pour datasetId: ${datasetId}`,
          );
        } catch (dbError) {
          this.logger.error(
            `Erreur d'écriture Prisma dans [processData]:`,
            dbError,
          );
        }
      }),
      catchError((error) => {
        this.logger.error(
          `Erreur gRPC [processData] pour datasetId ${datasetId}:`,
          error.message || error,
        );
        return throwError(
          () =>
            new InternalServerErrorException(
              'Erreur lors du traitement des données analytiques',
            ),
        );
      }),
    );
  }

  /**
   * Sauvegarde un point de métrique individuel dans PostgreSQL
   *
   * @param metricType Type de la métrique (ex: 'cpu_usage', 'memory_usage')
   * @param value Valeur numérique de la métrique
   * @param timestamp Timestamp UNIX en secondes
   */
  async saveMetricPoint(metricType: string, value: number, timestamp: number) {
    try {
      return await this.prisma.metricEntry.create({
        data: {
          metricType,
          value,
          timestamp: new Date(timestamp * 1000),
        },
      });
    } catch (error) {
      this.logger.error(
        `Erreur d'écriture Prisma [saveMetricPoint] pour ${metricType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Souscrit au flux gRPC de métriques en temps réel généré par Python (RPC Server Streaming)
   *
   * @param metricType Nom de la métrique (ex: 'cpu_usage', 'memory_usage')
   * @param intervalSeconds Intervalle entre chaque émission en secondes
   */
  getMetricsStream(
    metricType: string = 'cpu_usage',
    intervalSeconds: number = 1,
  ): Observable<MetricPoint> {
    const payload: StreamMetricsRequest = {
      metric_type: metricType,
      interval_seconds: intervalSeconds,
    };

    return this.analyticsGrpcService.streamMetrics(payload).pipe(
      catchError((error) => {
        this.logger.error(
          `Erreur gRPC Stream [streamMetrics] pour type ${metricType}:`,
          error.message || error,
        );
        return throwError(
          () =>
            new InternalServerErrorException(
              'Interruption du flux gRPC de métriques',
            ),
        );
      }),
    );
  }
}