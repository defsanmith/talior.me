import { Module } from "@nestjs/common";
import { AIModule } from "./ai/ai.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProcessorModule } from "./processor/processor.module";

@Module({
  imports: [PrismaModule, AIModule, ProcessorModule],
})
export class AppModule {}
