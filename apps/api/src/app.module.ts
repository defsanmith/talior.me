import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { QueueModule } from "./queue/queue.module";
import { JobsModule } from "./jobs/jobs.module";
import { ProfileModule } from "./profile/profile.module";
import { EventsModule } from "./events/events.module";

@Module({
  imports: [PrismaModule, QueueModule, JobsModule, ProfileModule, EventsModule],
})
export class AppModule {}
