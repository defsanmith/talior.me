import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { ProcessorModule } from "./processor/processor.module";
import { OpenAIModule } from "./openai/openai.module";

@Module({
  imports: [PrismaModule, OpenAIModule, ProcessorModule],
})
export class AppModule {}
