import { Module } from "@nestjs/common";
import { PdfModule } from "../pdf/pdf.module";
import { PrismaModule } from "../prisma/prisma.module";
import { PresetsController } from "./presets.controller";
import { PresetsService } from "./presets.service";

@Module({
  imports: [PrismaModule, PdfModule],
  controllers: [PresetsController],
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}
