import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { EventsModule } from "./events/events.module";
import { JobsModule } from "./jobs/jobs.module";
import { PdfModule } from "./pdf/pdf.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { QueueModule } from "./queue/queue.module";
import { TrackerModule } from "./tracker/tracker.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    QueueModule,
    JobsModule,
    ProfileModule,
    EventsModule,
    PdfModule,
    TrackerModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
