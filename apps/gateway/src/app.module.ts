import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AnalyticsService } from './modules/analytics/analytics.service';
import { AnalyticsGateway } from './modules/analytics/analytics.gateway';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ANALYTICS_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'analytics',
          protoPath: join(__dirname, '../../../shared/proto/analytics.proto'),
          url: process.env.ANALYTICS_GRPC_URL || 'analytics-service:50051',
        },
      },
    ]),
  ],
  providers: [AnalyticsService, AnalyticsGateway],
})
export class AppModule {}