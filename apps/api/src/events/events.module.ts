import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    }),
  ],
  providers: [EventsGateway],
})
export class EventsModule {}
