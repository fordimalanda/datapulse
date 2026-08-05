import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AnalyticsService } from './analytics.service';
import { AnalyticsGateway } from './analytics.gateway';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ANALYTICS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'analytics', // Correspond au 'package analytics;' du .proto
          protoPath: join(process.cwd(), 'shared/proto/analytics.proto'),
          url: process.env.ANALYTICS_GRPC_URL || 'analytics-service:50051', // Aligné avec docker-compose.yml
        },
      },
    ]),
  ],
  controllers: [],
  providers: [AnalyticsService, AnalyticsGateway],
  exports: [AnalyticsService, ClientsModule],
})
export class AnalyticsModule {}