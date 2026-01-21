import { Module } from "@nestjs/common";
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
    QueueModule,
    JobsModule,
    ProfileModule,
    EventsModule,
    PdfModule,
    TrackerModule,
  ],
})
export class AppModule {}
