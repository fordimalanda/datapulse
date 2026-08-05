import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { AnalyticsGateway } from './modules/analytics/analytics.gateway';

@Module({
  imports: [
    // Configuration du client gRPC pour communiquer avec le conteneur Python (analytics-service)
    ClientsModule.register([
      {
        name: 'ANALYTICS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'analytics', // Doit correspondre au package défini dans analytics.proto
          protoPath: join(process.cwd(), '../../shared/proto/analytics.proto'),
          url: process.env.ANALYTICS_SERVICE_URL || 'analytics-service:50051', // Hôte Docker Compose
        },
      },
    ]),
  ],
  controllers: [],
  providers: [
    AnalyticsService,
    AnalyticsGateway,
  ],
})
export class AppModule {}